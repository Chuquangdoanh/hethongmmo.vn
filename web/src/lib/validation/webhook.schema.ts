import { z } from "zod";

// SePay webhook payload
export const sepayWebhookSchema = z.object({
  id: z.number(),
  gateway: z.string(),
  transactionDate: z.string(),
  accountNumber: z.string(),
  code: z.string().nullable(),
  content: z.string(),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.number().positive(),
  accumulated: z.number(),
  subAccId: z.string().optional(),
  referenceCode: z.string(),
  description: z.string(),
});

export type SepayWebhookPayload = z.infer<typeof sepayWebhookSchema>;
