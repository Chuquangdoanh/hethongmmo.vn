import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { createVpsOrderSchema } from "@/lib/validation/vps-order.schema";
import { purchaseVpsProduct } from "@/lib/external-providers/vncloud-fulfill.service";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createVpsOrderSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await purchaseVpsProduct({
      userId:            me.id,
      externalProductId: parsed.data.externalProductId,
      billingCycle:      parsed.data.billingCycle,
      os:                parsed.data.os,
      quantity:          parsed.data.quantity,
      idempotencyKey:    parsed.data.idempotencyKey,
      customerNote:      parsed.data.customerNote,
      couponCode:        parsed.data.couponCode,
    });

    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
