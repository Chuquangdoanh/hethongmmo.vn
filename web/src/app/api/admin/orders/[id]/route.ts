import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "DONE", "CANCELLED", "REFUNDED", "DISPUTED"]),
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
      select: { id: true, status: true, orderCode: true, userId: true, itemName: true },
    });
    if (!order) throw new NotFoundError("Order");

    const { status, note } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === "DONE" ? { completedAt: new Date() } : {}),
        },
      });

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
