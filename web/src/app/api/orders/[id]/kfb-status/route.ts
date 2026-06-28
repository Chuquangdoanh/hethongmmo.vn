import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { khuongfbGetOrder } from "@/lib/khuongfb/client";
import { apiOk, apiCatch } from "@/lib/api-response";
import { NotFoundError, AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, userId: me.id },
      select: { orderType: true, externalOrderId: true, status: true },
    });

    if (!order) throw new NotFoundError("Đơn hàng");
    if (order.orderType !== "KHUONGFB_PRODUCT") {
      throw new AppError("Đơn hàng này không phải Khuongfb", "INVALID_ORDER_TYPE", 400);
    }
    if (!order.externalOrderId) {
      throw new AppError("Đơn hàng chưa có mã giao dịch Khuongfb", "NO_EXTERNAL_ID", 400);
    }

    const result = await khuongfbGetOrder(order.externalOrderId);

    return apiOk({
      transId:    order.externalOrderId,
      orderStatus: order.status,
      kfb:        result,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
