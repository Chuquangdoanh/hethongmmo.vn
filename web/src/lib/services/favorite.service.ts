import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";
import type { FavoriteProductTypeValue } from "@/lib/validation/favorite.schema";

export type { FavoriteProductTypeValue };

export interface FavoriteStatus {
  isFavorite: boolean;
  favoriteCount: number;
}

/** Toggle yêu thích — trả về trạng thái mới sau khi toggle */
export async function toggleFavorite(
  userId: string,
  productType: FavoriteProductTypeValue,
  productId: string,
): Promise<FavoriteStatus> {
  const existing = await prisma.productFavorite.findUnique({
    where: { userId_productType_productId: { userId, productType, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.productFavorite.delete({
      where: { userId_productType_productId: { userId, productType, productId } },
    });
    logger.info({ userId, productType, productId }, "favorite:unlike");
  } else {
    await prisma.productFavorite.create({
      data: { userId, productType, productId },
    });
    logger.info({ userId, productType, productId }, "favorite:like");
  }

  const favoriteCount = await prisma.productFavorite.count({
    where: { productType, productId },
  });

  return { isFavorite: !existing, favoriteCount };
}

/** Lấy trạng thái yêu thích (count + isFavorite) cho một sản phẩm */
export async function getFavoriteStatus(
  userId: string | undefined,
  productType: FavoriteProductTypeValue,
  productId: string,
): Promise<FavoriteStatus> {
  const [favoriteCount, userFav] = await Promise.all([
    prisma.productFavorite.count({ where: { productType, productId } }),
    userId
      ? prisma.productFavorite.findUnique({
          where: { userId_productType_productId: { userId, productType, productId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return { isFavorite: !!userFav, favoriteCount };
}

/**
 * Batch query favorite counts và user's favorites cho nhiều sản phẩm cùng lúc.
 * Tránh N+1 query khi render danh sách sản phẩm.
 */
export async function batchGetFavoriteData(params: {
  userId: string | undefined;
  mmoProductIds: string[];
  sellerProductIds: string[];
}): Promise<{
  mmoFavCounts: Map<string, number>;
  sellerFavCounts: Map<string, number>;
  myMmoFavs: Set<string>;
  mySellerFavs: Set<string>;
}> {
  const { userId, mmoProductIds, sellerProductIds } = params;

  const [mmoCountRows, sellerCountRows, myMmoRows, mySellerRows] = await Promise.all([
    mmoProductIds.length > 0
      ? prisma.productFavorite.groupBy({
          by: ["productId"],
          where: { productType: "MMO_PRODUCT", productId: { in: mmoProductIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    sellerProductIds.length > 0
      ? prisma.productFavorite.groupBy({
          by: ["productId"],
          where: { productType: "SELLER_PRODUCT", productId: { in: sellerProductIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    userId && mmoProductIds.length > 0
      ? prisma.productFavorite.findMany({
          where: { userId, productType: "MMO_PRODUCT", productId: { in: mmoProductIds } },
          select: { productId: true },
        })
      : Promise.resolve([]),
    userId && sellerProductIds.length > 0
      ? prisma.productFavorite.findMany({
          where: { userId, productType: "SELLER_PRODUCT", productId: { in: sellerProductIds } },
          select: { productId: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    mmoFavCounts: new Map(mmoCountRows.map((r) => [r.productId, r._count.id])),
    sellerFavCounts: new Map(sellerCountRows.map((r) => [r.productId, r._count.id])),
    myMmoFavs: new Set(myMmoRows.map((r) => r.productId)),
    mySellerFavs: new Set(mySellerRows.map((r) => r.productId)),
  };
}

/** Danh sách sản phẩm đã yêu thích của user (có phân trang) */
export async function getUserFavorites(
  userId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.productFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        productType: true,
        productId: true,
        createdAt: true,
      },
    }),
    prisma.productFavorite.count({ where: { userId } }),
  ]);

  return { items, total, totalPages: Math.ceil(total / limit) };
}
