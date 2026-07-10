import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sendSellerApprovedEmail, sendSellerRejectedEmail } from "@/lib/services/email.service";
import { notifySellerShopLocked } from "@/lib/services/telegram-alert.service";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), approvedCategory: z.string().min(1).max(100) }),
  z.object({ action: z.literal("reject"), rejectReason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("lock_shop") }),
  z.object({ action: z.literal("unlock_shop") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
 await requirePermission(session, "sellers:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    let notifyShopLockedSellerId = "";
    let notifyShopLocked = false;

    await prisma.$transaction(async (tx) => {
      const request = await tx.sellerRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, fullName: true, maxSellerProducts: true, sellerStatus: true } },
        },
      });
      if (!request) throw new NotFoundError("SellerRequest");

      if (parsed.data.action === "approve") {
        if (request.status !== "PENDING") {
          throw new ValidationError(`Yêu cầu đã ở trạng thái ${request.status}`);
        }
        const { approvedCategory } = parsed.data;

        await tx.sellerRequest.update({
          where: { id },
          data: { status: "APPROVED", approvedCategory, approvedAt: new Date(), reviewedByUserId: admin.id },
        });

        await tx.user.update({
          where: { id: request.userId },
          data: { role: "SELLER", sellerStatus: "APPROVED", sellerCategory: approvedCategory },
        });

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: "Tài khoản bán hàng được duyệt",
            body: `Tài khoản seller danh mục ${approvedCategory} đã được phê duyệt.`,
            type: "SELLER_APPROVED",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "SELLER_REQUEST_APPROVED",
            targetType: "SellerRequest",
            targetId: id,
            before: { sellerStatus: request.user.sellerStatus },
            after: { sellerStatus: "APPROVED", approvedCategory },
            metadata: { approvedCategory },
          },
        });

        sendSellerApprovedEmail({
          to: request.user.email,
          category: approvedCategory,
          maxProducts: request.user.maxSellerProducts,
        }).catch(() => {});
      } else if (parsed.data.action === "reject") {
        if (request.status !== "PENDING") {
          throw new ValidationError(`Yêu cầu đã ở trạng thái ${request.status}`);
        }
        const { rejectReason } = parsed.data;

        await tx.sellerRequest.update({
          where: { id },
          data: { status: "REJECTED", rejectReason, rejectedAt: new Date(), reviewedByUserId: admin.id },
        });

        await tx.user.update({
          where: { id: request.userId },
          data: { sellerStatus: "REJECTED", role: "USER" },
        });

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: "Yêu cầu bán hàng bị từ chối",
            body: `Lý do: ${rejectReason}`,
            type: "SYSTEM",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "SELLER_REQUEST_REJECTED",
            targetType: "SellerRequest",
            targetId: id,
            before: { sellerStatus: request.user.sellerStatus },
            after: { sellerStatus: "REJECTED", rejectReason },
            metadata: { rejectReason },
          },
        });

        sendSellerRejectedEmail({
          to: request.user.email,
          rejectReason,
        }).catch(() => {});
      } else if (parsed.data.action === "lock_shop" || parsed.data.action === "unlock_shop") {
        const locked = parsed.data.action === "lock_shop";
        notifyShopLockedSellerId = request.userId;
        notifyShopLocked = locked;
        await tx.$executeRaw`UPDATE users SET shop_locked = ${locked} WHERE id = ${request.userId}`;

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: locked ? "Gian hàng của bạn đã bị khóa" : "Gian hàng của bạn đã được mở khóa",
            body: locked
              ? "Admin đã khóa gian hàng. Sản phẩm sẽ ẩn và bạn không thể rút tiền cho đến khi được mở khóa."
              : "Admin đã mở khóa gian hàng. Bạn có thể tiếp tục bán hàng bình thường.",
            type: "SYSTEM",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: locked ? "SELLER_SHOP_LOCKED" : "SELLER_SHOP_UNLOCKED",
            targetType: "User",
            targetId: request.userId,
            before: { shopLocked: !locked },
            after: { shopLocked: locked },
          },
        });
      }
    });

    if (notifyShopLockedSellerId) {
      notifySellerShopLocked(notifyShopLockedSellerId, notifyShopLocked);
    }

    return apiSuccess();
  } catch (err) {
    return apiCatch(err);
  }
}
