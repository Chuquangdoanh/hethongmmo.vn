import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { z } from "zod";
import { purchaseKhuongfbProduct } from "@/lib/khuongfb/fulfill.service";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  externalProductId: z.string().uuid(),
  quantity:          z.number().int().min(1).max(100),
  idempotencyKey:    z.string().min(16).max(64),
  customerNote:      z.string().max(500).optional(),
  couponCode:        z.string().min(3).max(50).trim().toUpperCase().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await purchaseKhuongfbProduct({
      userId:            me.id,
      externalProductId: parsed.data.externalProductId,
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
