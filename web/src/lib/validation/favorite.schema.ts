import { z } from "zod";

export const FAVORITE_PRODUCT_TYPES = [
  "SERVICE",
  "COURSE",
  "TUTTRICK",
  "MMO_PRODUCT",
  "SELLER_PRODUCT",
] as const;

export type FavoriteProductTypeValue = (typeof FAVORITE_PRODUCT_TYPES)[number];

export const toggleFavoriteSchema = z.object({
  productType: z.enum(FAVORITE_PRODUCT_TYPES),
  productId:   z.string().uuid(),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;

export const getFavoritesQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
