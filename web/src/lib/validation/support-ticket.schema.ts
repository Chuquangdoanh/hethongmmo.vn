import { z } from "zod";

export const createSupportTicketSchema = z.object({
  orderId: z.string().uuid(),
});

export const sendSupportMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type SendSupportMessageInput = z.infer<typeof sendSupportMessageSchema>;
