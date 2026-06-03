import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
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
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true,
        balance: true, totalDeposited: true, totalSpent: true,
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
    const admin = requireAdmin(session);
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
    const admin = requireAdmin(session);
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
