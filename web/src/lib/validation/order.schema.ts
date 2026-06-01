import { z } from "zod";

export const purchaseSchema = z.object({
  orderType: z.enum(["SERVICE", "COURSE", "TUTTRICK", "MMO_PRODUCT", "SELLER_PRODUCT"]),
  productId: z.string().uuid(),
  warrantyVariant: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["PROCESSING", "DONE", "CANCELLED", "REFUNDED"]),
  note: z.string().max(500).optional(),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
