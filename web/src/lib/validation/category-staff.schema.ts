import { z } from "zod";

export const createCategoryStaffSchema = z.object({
  category:    z.string().min(1).max(100).trim(),
  name:        z.string().min(1).max(100).trim(),
  role:        z.string().min(1).max(100).trim(),
  description: z.string().max(1000).trim().optional().or(z.literal("")),
  avatarUrl:   z.string().url().optional().or(z.literal("")),
});

export const updateCategoryStaffSchema = z.object({
  category:    z.string().min(1).max(100).trim().optional(),
  name:        z.string().min(1).max(100).trim().optional(),
  role:        z.string().min(1).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional().or(z.literal("")),
  avatarUrl:   z.string().url().optional().or(z.literal("")),
  isActive:    z.boolean().optional(),
});

export type CreateCategoryStaffInput = z.infer<typeof createCategoryStaffSchema>;
export type UpdateCategoryStaffInput = z.infer<typeof updateCategoryStaffSchema>;
