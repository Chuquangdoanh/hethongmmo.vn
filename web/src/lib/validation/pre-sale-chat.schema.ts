import { z } from "zod";

export const createPreSaleChatSchema = z.object({
  sellerId: z.string().uuid(),
});

export const sendPreSaleMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export type CreatePreSaleChatInput = z.infer<typeof createPreSaleChatSchema>;
export type SendPreSaleMessageInput = z.infer<typeof sendPreSaleMessageSchema>;
