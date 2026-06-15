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

    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedByUserId: me.id,
          resolvedAt: new Date(),
          resolution: "Đơn hàng được xác nhận hợp lệ. Nhà bán hàng có thể rút tiền.",
        },
      });

      if (complaint.orderId) {
        // Ensure order is DONE so seller can withdraw
        await tx.order.update({
          where: { id: complaint.orderId },
          data: { status: "DONE" },
        });
      }
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CONFIRM_ORDER_COMPLAINT",
      targetType: "Complaint",
      targetId: id,
      after: { status: "RESOLVED", orderId: complaint.orderId, outcome: "seller_wins" },
    });

    void (async () => {
      try {
        const userRow = await prisma.user.findUnique({ where: { id: complaint.userId }, select: { email: true } });
        if (userRow?.email) {
          await sendComplaintResolvedEmail({
            to: userRow.email,
            subject: complaint.subject,
            title: "Khiếu nại bị từ chối",
            body: "Đơn hàng đã được xác nhận hợp lệ. Nếu bạn vẫn gặp vấn đề, vui lòng liên hệ hỗ trợ.",
            isPositive: false,
          });
        }
        if (complaint.orderId) {
          const order = await prisma.order.findUnique({ where: { id: complaint.orderId }, select: { sellerId: true } });
          if (order?.sellerId) {
            const seller = await prisma.user.findUnique({ where: { id: order.sellerId }, select: { email: true } });
            if (seller?.email) {
              await sendComplaintResolvedEmail({
                to: seller.email,
                subject: complaint.subject,
                title: "Khiếu nại được giải quyết — Đơn hàng hợp lệ",
                body: "Đơn hàng đã được xác nhận hợp lệ. Bạn có thể tiến hành rút tiền.",
                isPositive: true,
              });
            }
          }
        }
      } catch { /* silent — không block response */ }
    })();

    return apiOk({ resolved: true, outcome: "seller_wins" });
  } catch (err) {
    return apiCatch(err);
  }
}
