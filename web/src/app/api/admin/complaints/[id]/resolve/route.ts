import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { sendComplaintResolvedEmail } from "@/lib/services/email.service";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const session = await auth();
    const me = requireAdmin(session);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, status: true, orderId: true, subject: true, userId: true },
    });
    if (!complaint) return apiError("Khiếu nại không tồn tại", "NOT_FOUND", 404);
    if (complaint.status === "RESOLVED" || complaint.status === "REJECTED") {
      return apiError("Khiếu nại đã được xử lý", "ALREADY_RESOLVED", 400);
    }

    let frozenOrderId: string | null = null;
    let sellerDeducted = false;
    let deductedAmount = 0;

    await prisma.$transaction(async (tx) => {
      // Mark complaint resolved
      await tx.complaint.update({
        where: { id },
        data: {
          status: "REJECTED",
          resolvedByUserId: me.id,
          resolvedAt: new Date(),
          resolution: "Đơn hàng bị đóng băng do khiếu nại được giải quyết.",
        },
      });

      if (!complaint.orderId) return;

      const order = await tx.order.findUnique({
        where: { id: complaint.orderId },
        select: { id: true, status: true, finalPrice: true, sellerId: true, withdrawn: true },
      });
      if (!order) return;

      frozenOrderId = order.id;

      // Freeze the order
      await tx.order.update({
        where: { id: order.id },
        data: { status: "FROZEN" },
      });

      // If seller already cashed out (withdrawn=true), deduct from their user balance
      if (order.withdrawn && order.sellerId) {
        const seller = await tx.user.findUnique({
          where: { id: order.sellerId },
          select: { id: true, balance: true },
        });
        if (seller) {
          const amt = Number(order.finalPrice);
          const balanceBefore = Number(seller.balance);
          const balanceAfter = balanceBefore - amt; // allow negative to reflect debt
          deductedAmount = amt;
          sellerDeducted = true;
          await tx.user.update({
            where: { id: order.sellerId },
            data: { balance: balanceAfter },
          });
          await tx.transaction.create({
            data: {
              userId: order.sellerId,
              orderId: order.id,
              type: "COMPLAINT_DEDUCTION",
              amount: -amt,
              description: `Trừ tiền do khiếu nại đơn hàng #${order.id} được giải quyết`,
              balanceBefore,
              balanceAfter,
            },
          });
        }
      }
    });

    await writeAuditLog({
      actorId: me.id,
      action: "RESOLVE_COMPLAINT_FREEZE",
      targetType: "Complaint",
      targetId: id,
      after: { frozenOrderId, sellerDeducted, deductedAmount },
    });

    const capturedFrozenOrderId = frozenOrderId;
    void (async () => {
      try {
        const userRow = await prisma.user.findUnique({ where: { id: complaint.userId }, select: { email: true } });
        if (userRow?.email) {
          await sendComplaintResolvedEmail({
            to: userRow.email,
            subject: complaint.subject,
            title: "Khiếu nại được chấp nhận",
            body: "Đơn hàng liên quan đã bị đóng băng để xem xét. Admin sẽ liên hệ với bạn về các bước tiếp theo.",
            isPositive: true,
          });
        }
        if (capturedFrozenOrderId) {
          const frozenOrder = await prisma.order.findUnique({ where: { id: capturedFrozenOrderId }, select: { sellerId: true } });
          if (frozenOrder?.sellerId) {
            const seller = await prisma.user.findUnique({ where: { id: frozenOrder.sellerId }, select: { email: true } });
            if (seller?.email) {
              await sendComplaintResolvedEmail({
                to: seller.email,
                subject: complaint.subject,
                title: "Đơn hàng bị đóng băng",
                body: "Đơn hàng của bạn đã bị đóng băng do khiếu nại từ người mua được giải quyết. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.",
                isPositive: false,
              });
            }
          }
        }
      } catch { /* silent — không block response */ }
    })();

    return apiOk({ resolved: true, frozenOrderId, sellerDeducted, deductedAmount });
  } catch (err) {
    return apiCatch(err);
  }
}
