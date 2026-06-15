import { z } from "zod";

export const createCourseSupportSchema = z.object({
  icon:         z.string().min(1).max(10).trim().default("✅"),
  title:        z.string().min(1).max(200).trim(),
  description:  z.string().max(500).trim().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive:     z.boolean().optional().default(true),
});

export const updateCourseSupportSchema = z.object({
  icon:         z.string().min(1).max(10).trim().optional(),
  title:        z.string().min(1).max(200).trim().optional(),
  description:  z.string().max(500).trim().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive:     z.boolean().optional(),
});

export type CreateCourseSupportInput = z.infer<typeof createCourseSupportSchema>;
export type UpdateCourseSupportInput = z.infer<typeof updateCourseSupportSchema>;
