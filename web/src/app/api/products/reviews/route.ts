import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

// Deprecated: use /api/user/reviews instead (per-order review system)
const reviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { orderId, rating, comment } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: me.id, status: "DONE" },
      select: { id: true, orderType: true, mmoProductId: true, sellerProductId: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Đơn hàng không hợp lệ.", code: "NOT_FOUND" }, { status: 404 });
    }

    const productId = order.orderType === "MMO_PRODUCT" ? order.mmoProductId : order.sellerProductId;
    const productType = order.orderType === "MMO_PRODUCT" ? "MMO_PRODUCT" : "SELLER_PRODUCT";
    if (!productId) {
      return NextResponse.json({ error: "Sản phẩm không hỗ trợ đánh giá.", code: "NOT_REVIEWABLE" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: { orderId, userId: me.id, productType, productId, rating, comment: comment ?? null },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    return apiOk(review);
  } catch (err) {
    return apiCatch(err);
  }
}
