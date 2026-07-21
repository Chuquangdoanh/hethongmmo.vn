import { prisma } from "@/lib/db/prisma";
import { getResourceDiscountInfo, getSellerDiscountInfo } from "@/lib/utils/discount";

/**
 * % giảm giá thực áp dụng cho Tài nguyên MMO / Kho nguyên liệu / Khương FB
 * của 1 user cụ thể — dùng chung cho cả luồng checkout lẫn hiển thị preview giá.
 */
export async function getUserResourceDiscountPercent(userId: string): Promise<number> {
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { discountPercent: true, totalDeposited: true, agentDiscountPercent: true },
  });
  if (!userRow) return 0;

  return getResourceDiscountInfo(
    Number(userRow.totalDeposited),
    userRow.discountPercent,
    userRow.agentDiscountPercent,
  ).pct;
}

/**
 * % giảm giá thực áp dụng cho sản phẩm Seller của 1 user cụ thể.
 * Hệ thống chịu 100% chi phí — seller không bị ảnh hưởng (xem purchase.service.ts).
 */
export async function getUserSellerDiscountPercent(userId: string): Promise<number> {
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { sellerDiscountPercent: true },
  });
  if (!userRow) return 0;

  return getSellerDiscountInfo(userRow.sellerDiscountPercent).pct;
}
