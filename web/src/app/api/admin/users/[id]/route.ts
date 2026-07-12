import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { apiOk, apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ban") }),
  z.object({ action: z.literal("unban") }),
  z.object({
    action: z.literal("change_role"),
    role: z.enum(["USER", "SELLER", "STAFF", "ADMIN"]),
  }),
  z.object({
    action: z.literal("adjust_balance"),
    amount: z.number().refine((n) => n !== 0, "Số tiền không được bằng 0"),
    note: z.string().min(1).max(500).optional(),
  }),
  z.object({
    action: z.literal("revoke_seller"),
    reason: z.string().min(1).max(500).optional(),
  }),
  z.object({
    action: z.literal("set_discount"),
    discountPercent: z.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal("set_agent_discount"),
    agentDiscountPercent: z.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal("set_discount_all"),
    percent: z.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal("adjust_escrow"),
    amount: z.number().refine((n) => n !== 0, "Số tiền không được bằng 0"),
    note: z.string().min(1).max(500).optional(),
  }),
  z.object({
    action: z.literal("set_escrow_required"),
    amount: z.number().min(0, "Mức ký quỹ yêu cầu không được âm"),
    note: z.string().min(1).max(500).optional(),
  }),
  z.object({ action: z.literal("request_seller_reverify") }),
  z.object({ action: z.literal("cancel_seller_reverify") }),
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);
    await requirePermission(session, "users:read");
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true,
        balance: true, totalDeposited: true, totalSpent: true,
        discountPercent: true, agentDiscountPercent: true,
        sellerStatus: true, sellerCategory: true, maxSellerProducts: true,
        twoFactorEnabled: true,
        lastLoginAt: true, lastLoginIp: true,
        failedLoginCount: true, lockedUntil: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundError("User");

    return apiOk(user);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
    await requirePermission(session, "users:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, balance: true, sellerStatus: true },
    });
    if (!user) throw new NotFoundError("User");

    const { action } = parsed.data;

    if (action === "ban" || action === "unban") {
      if (id === admin.id) {
        return apiError("Không thể tự khóa tài khoản mình", "FORBIDDEN", 403);
      }
      const newStatus = action === "ban" ? "BANNED" : "ACTIVE";

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { status: newStatus } });

        if (action === "ban") {
          await tx.notification.create({
            data: {
              userId: id,
              title: "Tài khoản bị khóa",
              body: "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.",
              type: "SYSTEM",
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: `ADMIN_${action.toUpperCase()}_USER`,
            targetType: "User",
            targetId: id,
            before: { status: user.status },
            after: { status: newStatus },
          },
        });
      });

      logger.info({ adminId: admin.id, targetUserId: id, action }, "Admin ban/unban user");
      return apiSuccess();
    }

    if (action === "change_role") {
      if (id === admin.id) {
        return apiError("Không thể tự thay đổi role mình", "FORBIDDEN", 403);
      }
      const { role } = parsed.data as Extract<(typeof parsed)["data"], { action: "change_role" }>;
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { role } });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_CHANGE_ROLE",
            targetType: "User",
            targetId: id,
            before: { role: user.role },
            after: { role },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, role: parsed.data.role }, "Admin changed user role");
      return apiSuccess();
    }

    if (action === "adjust_balance") {
      const { amount, note } = parsed.data;
      await prisma.$transaction(async (tx) => {
        const locked = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { balance: true },
        });
        const balanceBefore = locked.balance;
        const balanceAfter = Number(balanceBefore) + amount;
        if (balanceAfter < 0) throw new Error("Số dư không được âm");

        await tx.user.update({ where: { id }, data: { balance: balanceAfter } });
        await tx.transaction.create({
          data: {
            userId: id,
            type: "ADMIN_ADJUSTMENT",
            amount,
            description: note ?? `Admin điều chỉnh số dư: ${amount > 0 ? "+" : ""}${amount}`,
            balanceBefore,
            balanceAfter,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_ADJUST_BALANCE",
            targetType: "User",
            targetId: id,
            before: { balance: Number(balanceBefore) },
            after: { balance: balanceAfter, amount, note },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, amount }, "Admin adjusted user balance");
      return apiSuccess();
    }

    if (action === "revoke_seller") {
      if (user.sellerStatus === "NONE") {
        return apiError("Người dùng chưa đăng ký bán hàng", "INVALID_ACTION", 400);
      }
      const { reason } = parsed.data as Extract<(typeof parsed)["data"], { action: "revoke_seller" }>;
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: { sellerStatus: "NONE", sellerCategory: null, role: "USER" },
        });
        await tx.notification.create({
          data: {
            userId: id,
            title: "Quyền bán hàng bị thu hồi",
            body: reason ?? "Quyền bán hàng của bạn đã bị thu hồi bởi quản trị viên.",
            type: "SYSTEM",
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_REVOKE_SELLER",
            targetType: "User",
            targetId: id,
            before: { sellerStatus: user.sellerStatus, role: user.role },
            after: { sellerStatus: "NONE", role: "USER", reason: reason ?? null },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id }, "Admin revoked seller access");
      return apiSuccess();
    }

    if (action === "adjust_escrow") {
      const { amount, note } = parsed.data as Extract<(typeof parsed)["data"], { action: "adjust_escrow" }>;
      await prisma.$transaction(async (tx) => {
        const locked = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { sellerEscrow: true },
        });
        const escrowBefore = locked.sellerEscrow;
        const escrowAfter = Number(escrowBefore) + amount;
        if (escrowAfter < 0) throw new Error("Ký quỹ không được âm");

        await tx.user.update({ where: { id }, data: { sellerEscrow: escrowAfter } });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_ADJUST_ESCROW",
            targetType: "User",
            targetId: id,
            before: { sellerEscrow: Number(escrowBefore) },
            after: { sellerEscrow: escrowAfter, amount, note },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, amount }, "Admin adjusted seller escrow");
      return apiSuccess();
    }

    if (action === "set_escrow_required") {
      const { amount, note } = parsed.data as Extract<(typeof parsed)["data"], { action: "set_escrow_required" }>;
      await prisma.$transaction(async (tx) => {
        const locked = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { sellerEscrowRequired: true, sellerEscrow: true },
        });
        const requiredBefore = locked.sellerEscrowRequired;
        const currentEscrow  = Number(locked.sellerEscrow);
        const gap = amount - currentEscrow;

        await tx.user.update({ where: { id }, data: { sellerEscrowRequired: amount } });

        if (gap > 0) {
          await tx.notification.create({
            data: {
              userId: id,
              title: "Mức ký quỹ yêu cầu đã được nâng",
              body: `Quản trị viên đã nâng mức ký quỹ yêu cầu lên ${amount.toLocaleString("vi")}đ. ` +
                `Vui lòng nạp thêm ${gap.toLocaleString("vi")}đ vào ký quỹ tại Ví Seller → Ký quỹ để tiếp tục đủ điều kiện rút tiền.`,
              type: "SYSTEM",
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_SET_ESCROW_REQUIRED",
            targetType: "User",
            targetId: id,
            before: { sellerEscrowRequired: Number(requiredBefore) },
            after: { sellerEscrowRequired: amount, note },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, amount }, "Admin set seller escrow requirement");
      return apiSuccess();
    }

    if (action === "request_seller_reverify") {
      const pendingReverify = await prisma.sellerReverifyRequest.findFirst({
        where: { sellerId: id, status: "PENDING" },
        select: { id: true },
      });
      if (pendingReverify) {
        return apiError("Seller đã có ảnh xác minh đang chờ duyệt — hãy duyệt/từ chối trước", "PENDING_EXISTS", 400);
      }

      // Admin có thể bấm xác thực lại bất cứ lúc nào — luôn reset về trạng thái chưa xác minh
      await prisma.$transaction(async (tx) => {
        const locked = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { sellerReverifyRequired: true, sellerReverifyApproved: true },
        });

        await tx.user.update({
          where: { id },
          data: { sellerReverifyRequired: true, sellerReverifyApproved: false },
        });

        await tx.notification.create({
          data: {
            userId: id,
            title: "Cần xác minh lại tài khoản",
            body: "Quản trị viên yêu cầu bạn xác minh lại danh tính (CCCD/CMND + ảnh chân dung) trước khi rút tiền. " +
              "Vui lòng vào Ví Seller → Rút tiền để nộp ảnh xác minh.",
            type: "SYSTEM",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_REQUEST_SELLER_REVERIFY",
            targetType: "User",
            targetId: id,
            before: { sellerReverifyRequired: locked.sellerReverifyRequired, sellerReverifyApproved: locked.sellerReverifyApproved },
            after: { sellerReverifyRequired: true, sellerReverifyApproved: false },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id }, "Admin requested seller reverify");
      return apiSuccess();
    }

    if (action === "cancel_seller_reverify") {
      await prisma.$transaction(async (tx) => {
        const locked = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { sellerReverifyRequired: true },
        });

        await tx.user.update({ where: { id }, data: { sellerReverifyRequired: false } });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_CANCEL_SELLER_REVERIFY",
            targetType: "User",
            targetId: id,
            before: { sellerReverifyRequired: locked.sellerReverifyRequired },
            after: { sellerReverifyRequired: false },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id }, "Admin cancelled seller reverify requirement");
      return apiSuccess();
    }

    if (action === "set_discount") {
      const { discountPercent } = parsed.data as Extract<(typeof parsed)["data"], { action: "set_discount" }>;
      await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { discountPercent: true } });
        await tx.user.update({ where: { id }, data: { discountPercent } });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_SET_DISCOUNT",
            targetType: "User",
            targetId: id,
            before: { discountPercent: before.discountPercent },
            after: { discountPercent },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, discountPercent }, "Admin set user discount");
      return apiSuccess();
    }

    if (action === "set_agent_discount") {
      const { agentDiscountPercent } = parsed.data as Extract<(typeof parsed)["data"], { action: "set_agent_discount" }>;
      await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { agentDiscountPercent: true } });
        await tx.user.update({ where: { id }, data: { agentDiscountPercent } });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_SET_AGENT_DISCOUNT",
            targetType: "User",
            targetId: id,
            before: { agentDiscountPercent: before.agentDiscountPercent },
            after: { agentDiscountPercent },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, agentDiscountPercent }, "Admin set user agent discount");
      return apiSuccess();
    }

    if (action === "set_discount_all") {
      const { percent } = parsed.data as Extract<(typeof parsed)["data"], { action: "set_discount_all" }>;
      await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({
          where: { id },
          select: { discountPercent: true, agentDiscountPercent: true },
        });
        await tx.user.update({ where: { id }, data: { discountPercent: percent, agentDiscountPercent: percent } });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ADMIN_SET_DISCOUNT_ALL",
            targetType: "User",
            targetId: id,
            before: { discountPercent: before.discountPercent, agentDiscountPercent: before.agentDiscountPercent },
            after: { discountPercent: percent, agentDiscountPercent: percent },
          },
        });
      });
      logger.info({ adminId: admin.id, targetUserId: id, percent }, "Admin set combined discount (all)");
      return apiSuccess();
    }

    return apiError("Action không hợp lệ", "INVALID_ACTION", 400);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
    await requirePermission(session, "users:delete");
    const { id } = await params;

    if (id === admin.id) {
      return apiError("Không thể xóa tài khoản của chính mình", "FORBIDDEN", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new NotFoundError("User");

    if (user.role === "ADMIN") {
      return apiError("Không thể xóa tài khoản Admin", "FORBIDDEN", 403);
    }

    await prisma.$transaction(async (tx) => {
      // Audit log first (actor still exists in DB)
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ADMIN_HARD_DELETE_USER",
          targetType: "User",
          targetId: id,
          before: { email: user.email, role: user.role },
          after: { deleted: true },
        },
      });

      // 1. ChatRooms linked to this user's complaints (cascades ChatMember + ChatMessage)
      const complaintIds = (await tx.complaint.findMany({
        where: { userId: id },
        select: { id: true },
      })).map((c) => c.id);
      if (complaintIds.length > 0) {
        await tx.chatRoom.deleteMany({ where: { complaintId: { in: complaintIds } } });
      }

      // 2. Complaints, Reviews, Withdrawals, Transactions, Orders
      await tx.complaint.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.sellerWithdrawal.deleteMany({ where: { sellerId: id } });
      await tx.transaction.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({
        where: { OR: [{ userId: id }, { sellerId: id }] },
      });

      // 3. Hard delete — cascades: Session, RefreshToken, Notification,
      //    SellerRequest, SellerProduct (+ SellerProductStock)
      await tx.user.delete({ where: { id } });
    });

    logger.info({ adminId: admin.id, targetUserId: id }, "Admin hard-deleted user");
    return apiSuccess();
  } catch (err) {
    return apiCatch(err);
  }
}
