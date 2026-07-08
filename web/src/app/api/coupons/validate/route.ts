import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { apiRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { validateCouponSchema } from "@/lib/validation/coupon.schema";
import { checkCouponEligibility, applyCouponDiscount } from "@/lib/services/coupon.service";

export const runtime = "nodejs";

/**
 * Preview coupon trước khi checkout thật — orderValue do client tự tính (giá đã có tier/agent discount),
 * chỉ để hiển thị. Giá và điều kiện coupon luôn được xác thực lại chính xác ở /api/orders và /api/orders/kfb.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const rl = await checkRateLimit(apiRatelimit, `coupon-validate:${me.id}`);
    if (!rl.success) {
      return apiError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", "RATE_LIMITED", 429, { "Retry-After": "60" });
    }

    const body: unknown = await req.json();
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { code, orderType, productId, orderValue, quantity } = parsed.data;

    if (quantity > 1 && orderType !== "KHUONGFB_PRODUCT") {
      return apiError("Mã giảm giá chỉ áp dụng khi mua số lượng 1.", "COUPON_QUANTITY_NOT_SUPPORTED", 400);
    }

    const eligible = await checkCouponEligibility({ code, userId: me.id, orderType, productId, orderValue });
    const discountedPrice = applyCouponDiscount(orderValue, eligible);

    return apiOk({
      valid: true,
      discountType: eligible.discountType,
      discountValue: eligible.discountValue,
      discountedPrice,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
