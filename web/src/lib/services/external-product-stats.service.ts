import { prisma } from "@/lib/db/prisma";

/**
 * Đếm số lượng đã bán (đơn DONE) cho danh sách sản phẩm khuongfb.
 * Trả về Map<externalProductId, soldCount>. ID không có đơn nào sẽ không xuất hiện
 * trong map — đọc bằng `map.get(id) ?? 0`.
 */
export async function getExternalProductSoldCounts(
  externalProductIds: string[],
): Promise<Map<string, number>> {
  if (externalProductIds.length === 0) return new Map();

  const grouped = await prisma.order.groupBy({
    by: ["externalProductId"],
    where: {
      externalProductId: { in: externalProductIds },
      status: "DONE",
    },
    _count: { id: true },
  });

  return new Map(
    grouped
      .filter((g) => g.externalProductId !== null)
      .map((g) => [g.externalProductId as string, g._count.id]),
  );
}

/** Đếm số lượng đã bán (đơn DONE) cho 1 sản phẩm khuongfb. */
export async function getExternalProductSoldCount(externalProductId: string): Promise<number> {
  const map = await getExternalProductSoldCounts([externalProductId]);
  return map.get(externalProductId) ?? 0;
}
