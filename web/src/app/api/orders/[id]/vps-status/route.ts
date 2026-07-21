import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";
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

    const isStaff = me.role === "STAFF" || me.role === "ADMIN";
    const order = await prisma.order.findFirst({
      where:  isStaff ? { id } : { id, userId: me.id },
      select: { orderType: true, externalOrderId: true, externalSource: true, status: true },
    });

    if (!order) throw new NotFoundError("Đơn hàng");
    if (order.orderType !== "VPS_PRODUCT") {
      throw new AppError("Đơn hàng này không phải VPS", "INVALID_ORDER_TYPE", 400);
    }
    if (!order.externalOrderId) {
      throw new AppError("Đơn hàng chưa có mã VPS", "NO_EXTERNAL_ID", 400);
    }

    const adapters = await loadEnabledAdapters();
    const adapter  = adapters.find(a => a.providerId === order.externalSource);
    if (!adapter) throw new AppError("Provider VPS không khả dụng", "PROVIDER_NOT_FOUND", 502);

    const result = await adapter.getOrder(order.externalOrderId);

    return apiOk({
      transId:     order.externalOrderId,
      orderStatus: order.status,
      vps:         result,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
