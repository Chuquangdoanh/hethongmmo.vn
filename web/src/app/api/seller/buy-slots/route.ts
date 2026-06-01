import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { getSellerConfig, buySellerSlots, DEFAULT_SLOT_PACKAGES } from "@/lib/services/seller.service";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const schema = z.object({
  slots: z.number().int().positive(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const config = await getSellerConfig();
    const packages = config.slot_packages ?? DEFAULT_SLOT_PACKAGES;
    const pkg = packages.find((p) => p.slots === parsed.data.slots);
    if (!pkg) return apiError("Gói slot không hợp lệ", "INVALID_PACKAGE", 400);

    await buySellerSlots({ userId: me.id, slots: pkg.slots, price: pkg.price });

    return apiSuccess(`Đã mua gói ${pkg.slots} slot sản phẩm thành công`);
  } catch (err) {
    logger.error({ err }, "[buy-slots] Unexpected error");
    return apiCatch(err);
  }
}
