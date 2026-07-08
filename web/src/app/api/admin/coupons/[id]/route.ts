import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { updateCouponSchema } from "@/lib/validation/coupon.schema";
import { getCouponDetail, updateCoupon, deleteCoupon } from "@/lib/services/coupon.service";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id } = await params;

    const coupon = await getCouponDetail(id);
    return apiOk(coupon);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const coupon = await updateCoupon(id, parsed.data, me.id);
    return apiOk(coupon);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    await deleteCoupon(id, me.id);
    return apiSuccess("Đã tắt mã giảm giá");
  } catch (err) {
    return apiCatch(err);
  }
}
