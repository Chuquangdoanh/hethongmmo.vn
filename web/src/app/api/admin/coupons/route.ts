import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { createCouponSchema } from "@/lib/validation/coupon.schema";
import { listCoupons, createCoupon } from "@/lib/services/coupon.service";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const query = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) return apiValidationError(query.error.issues);
    const { page, limit } = query.data;

    const { data, total } = await listCoupons({ page, limit });
    return apiList(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const coupon = await createCoupon(parsed.data, me.id);
    return apiOk(coupon, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
