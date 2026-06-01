import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError, DuplicateError } from "@/lib/errors";

const REVIEWABLE_TYPES = new Set(["SELLER_PRODUCT", "MMO_PRODUCT"]);

export async function createReview(input: {
  userId: string;
  orderId: string;
  rating: number;
  comment?: string;
}) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: { id: true, status: true, orderType: true, sellerProductId: true, mmoProductId: true },
  });
  if (!order) throw new NotFoundError("Đơn hàng");
  if (order.status !== "DONE") throw new ValidationError("Chỉ có thể đánh giá đơn hàng đã hoàn thành");
  if (!REVIEWABLE_TYPES.has(order.orderType)) throw new ValidationError("Sản phẩm này không hỗ trợ đánh giá");

  const productId =
    order.orderType === "SELLER_PRODUCT" ? order.sellerProductId :
    order.orderType === "MMO_PRODUCT"    ? order.mmoProductId    : null;
  if (!productId) throw new ValidationError("Không xác định được sản phẩm");

  try {
    const review = await prisma.review.create({
      data: {
        orderId:     input.orderId,
        userId:      input.userId,
        productType: order.orderType,
        productId,
        rating:      input.rating,
        comment:     input.comment,
      },
    });
    return review;
  } catch (err: unknown) {
    // Prisma unique constraint violation on orderId
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      throw new DuplicateError("Đánh giá cho đơn hàng này");
    }
    throw err;
  }
}
