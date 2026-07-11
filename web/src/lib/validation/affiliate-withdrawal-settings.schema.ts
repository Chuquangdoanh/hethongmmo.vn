import { z } from "zod";

export const affiliateWithdrawalSettingsSchema = z.object({
  hold_days:              z.number().int().min(0).max(30),
  min_withdrawal_amount:  z.number().int().min(0),
  withdrawal_fee_percent: z.number().min(0).max(50),
});

export type AffiliateWithdrawalSettingsInput = z.infer<typeof affiliateWithdrawalSettingsSchema>;
