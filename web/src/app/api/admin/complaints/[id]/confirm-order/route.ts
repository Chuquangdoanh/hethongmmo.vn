import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { createAffiliateCommission } from "@/lib/services/affiliate-commission.service";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "complaints:close");

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
          resolution: "Đơn hàng được xác nhận hợp lệ. Admin đã thanh toán cho nhà bán hàng.",
        },
      });

      if (complaint.orderId) {
        // Admin xác nhận đơn hợp lệ (seller thắng) → đơn về DONE, withdrawn=false để
        // quay lại pool doanh số, seller rút theo luồng đơn hàng (KHÔNG cộng balance).
        const order = await tx.order.findUnique({
          where: { id: complaint.orderId },
          select: { finalPrice: true, sellerId: true, userId: true, orderType: true },
        });
        await tx.order.update({
          where: { id: complaint.orderId },
          data: { status: "DONE", withdrawn: false },
        });
        if (order) {
          await createAffiliateCommission(tx, { id: complaint.orderId, userId: order.userId, orderType: order.orderType, finalPrice: order.finalPrice });
        }
      }
    });

    await writeAuditLog({
      actorId: me.id,
      action: "CONFIRM_ORDER_COMPLAINT",
      targetType: "Complaint",
      targetId: id,
      after: { status: "RESOLVED", orderId: complaint.orderId, outcome: "seller_wins" },
    });

    return apiOk({ resolved: true, outcome: "seller_wins" });
  } catch (err) {
    return apiCatch(err);
  }
}
