import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const grantAffiliateSchema = z.object({
  userId: z.string().uuid(),
});

export const updateAffiliateStatusSchema = z.object({
  affiliateStatus: z.enum(["ACTIVE", "LOCKED"]).optional(),
  isAffiliate: z.boolean().optional(),
});

export const reassignCustomerSchema = z.object({
  customerId: z.string().uuid(),
  newAffiliateId: z.string().uuid().nullable(),
});

export const affiliateCommissionListSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "APPROVED", "VOIDED"]).optional(),
  affiliateId: z.string().uuid().optional(),
});

export const commissionActionSchema = z.object({
  action: z.enum(["APPROVE", "VOID"]),
  reason: z.string().max(500).optional(),
});

export const orderTypeSchema = z.enum([
  "SERVICE",
  "COURSE",
  "TUTTRICK",
  "MMO_PRODUCT",
  "SELLER_PRODUCT",
  "KHUONGFB_PRODUCT",
]);

export const createCommissionRuleSchema = z.object({
  affiliateId: z.string().uuid().nullable(),
  orderType: orderTypeSchema.nullable(),
  commissionPercent: z.number().min(0).max(100),
  priority: z.number().int().min(0).default(0),
});

export const updateCommissionRuleSchema = z.object({
  commissionPercent: z.number().min(0).max(100).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const processAffiliateWithdrawalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "COMPLETE"]),
  rejectReason: z.string().max(500).optional(),
});

export type GrantAffiliateInput = z.infer<typeof grantAffiliateSchema>;
export type ReassignCustomerInput = z.infer<typeof reassignCustomerSchema>;
export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;
