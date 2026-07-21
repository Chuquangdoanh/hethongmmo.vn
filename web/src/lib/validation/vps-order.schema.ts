import { z } from "zod";

export const createVpsOrderSchema = z.object({
  externalProductId: z.string().uuid(),
  billingCycle:       z.string().min(1).max(50).trim(),
  os:                 z.number().int().positive(),
  quantity:           z.number().int().min(1).max(50),
  idempotencyKey:     z.string().min(16).max(64),
  customerNote:       z.string().max(1000).trim().optional(),
  couponCode:         z.string().min(3).max(50).trim().toUpperCase().optional(),
});

export type CreateVpsOrderInput = z.infer<typeof createVpsOrderSchema>;
