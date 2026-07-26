import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";
import { createAffiliateCommission, voidAffiliateCommission } from "@/lib/services/affiliate-commission.service";
import { getSellerTierConfig } from "@/lib/services/seller.service";

const REVENUE_VOIDING_STATUSES = new Set(["CANCELLED", "REFUNDED", "FROZEN"]);

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "DONE", "CANCELLED", "REFUNDED", "DISPUTED", "FROZEN"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
    await requirePermission(session, "orders:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, orderCode: true, userId: true, itemName: true, finalPrice: true, orderType: true },
    });
    if (!order) throw new NotFoundError("Order");

    const { status, note } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // Lock order row trước khi đọc withdrawn/sellerId — tránh race với luồng seller rút tiền
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
      const lockedOrder = await tx.order.findUnique({
        where: { id },
        select: { status: true, sellerId: true, withdrawn: true, createdAt: true, finalPrice: true },
      });
      if (!lockedOrder) throw new NotFoundError("Order");

      // Đơn đã DONE (tính doanh số/khả rút cho seller) và admin đang hủy/hoàn tiền/đóng băng
      if (lockedOrder.sellerId && lockedOrder.status === "DONE" && REVENUE_VOIDING_STATUSES.has(status)) {
        const seller = await tx.user.findUnique({
          where: { id: lockedOrder.sellerId },
          select: { sellerTier: true },
        });
        const tierCfg = await getSellerTierConfig(seller?.sellerTier ?? "STANDARD");
        const holdDate = new Date(Date.now() - tierCfg.hold_days * 24 * 60 * 60 * 1000);

        // Quá hold day (seller đã/đủ điều kiện rút) — chặn đổi trạng thái qua kênh này
        if (lockedOrder.createdAt < holdDate) {
          throw new ValidationError(
            `Đơn hàng đã quá thời hạn giữ tiền (${tierCfg.hold_days} ngày) của seller — không thể chuyển trạng thái qua đây. Vui lòng xử lý qua kênh khiếu nại.`,
          );
        }

        // Phòng hờ: nếu seller đã rút tiền trong lúc còn hold day (race hiếm), trừ lại balance
        if (lockedOrder.withdrawn) {
          const refundAmt = Number(lockedOrder.finalPrice);
          const sellerRows = await tx.$queryRaw<Array<{ balance: string }>>`
            SELECT balance::text FROM users WHERE id = ${lockedOrder.sellerId}::uuid FOR UPDATE
          `;
          const sellerBalanceBefore = parseFloat(sellerRows[0]?.balance ?? "0");
          if (sellerBalanceBefore < refundAmt) {
            throw new ValidationError(
              `Ví seller không đủ để trừ lại (cần ${refundAmt}, hiện có ${sellerBalanceBefore}). Vui lòng xử lý thủ công.`,
            );
          }
          const sellerBalanceAfter = sellerBalanceBefore - refundAmt;
          await tx.user.update({ where: { id: lockedOrder.sellerId }, data: { balance: sellerBalanceAfter } });
          await tx.transaction.create({
            data: {
              userId: lockedOrder.sellerId,
              orderId: id,
              type: "COMPLAINT_DEDUCTION",
              amount: -refundAmt,
              description: `Trừ tiền seller do admin chuyển trạng thái đơn hàng sang ${status}`,
              balanceBefore: sellerBalanceBefore,
              balanceAfter: sellerBalanceAfter,
            },
          });
        }
      }

      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === "DONE" ? { completedAt: new Date() } : {}),
        },
      });

      if (status === "DONE") {
        await createAffiliateCommission(tx, { id: order.id, userId: order.userId, orderType: order.orderType, finalPrice: order.finalPrice });
      } else if (status === "CANCELLED" || status === "REFUNDED") {
        await voidAffiliateCommission(tx, order.id, `Admin cập nhật trạng thái đơn hàng sang ${status}`);
      }

      if (status === "DONE") {
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: "Đơn hàng hoàn thành",
            body: `Đơn hàng ${order.orderCode} (${order.itemName}) đã được xác nhận hoàn thành.`,
            type: "ORDER_STATUS",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ADMIN_UPDATE_ORDER_STATUS",
          targetType: "Order",
          targetId: id,
          before: { status: order.status },
          after: { status, note },
        },
      });
    });

    logger.info(
      { adminId: admin.id, orderId: id, orderCode: order.orderCode, oldStatus: order.status, newStatus: status },
      "Admin updated order status",
    );
    return apiSuccess();
  } catch (err) {
    return apiCatch(err);
  }
}
