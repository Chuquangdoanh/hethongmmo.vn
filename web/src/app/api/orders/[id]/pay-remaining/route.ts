import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { purchaseCourseRemainder } from "@/lib/services/purchase.service";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const order = await purchaseCourseRemainder(id, me.id);

    return apiOk({
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
      finalPrice: Number(order.finalPrice),
      remainingAmount: Number(order.remainingAmount ?? 0),
      paymentType: order.paymentType,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
