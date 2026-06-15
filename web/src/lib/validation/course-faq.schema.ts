import { z } from "zod";

export const createFaqCategorySchema = z.object({
  name:         z.string().min(1).max(100).trim(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const updateFaqCategorySchema = z.object({
  name:         z.string().min(1).max(100).trim().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createCourseFaqSchema = z.object({
  categoryId:   z.string().uuid().nullable().optional(),
  question:     z.string().min(1).max(500).trim(),
  answer:       z.string().min(1).max(5000).trim(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive:     z.boolean().optional().default(true),
});

export const updateCourseFaqSchema = z.object({
  categoryId:   z.string().uuid().nullable().optional(),
  question:     z.string().min(1).max(500).trim().optional(),
  answer:       z.string().min(1).max(5000).trim().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive:     z.boolean().optional(),
});

export type CreateFaqCategoryInput = z.infer<typeof createFaqCategorySchema>;
export type UpdateFaqCategoryInput = z.infer<typeof updateFaqCategorySchema>;
export type CreateCourseFaqInput   = z.infer<typeof createCourseFaqSchema>;
export type UpdateCourseFaqInput   = z.infer<typeof updateCourseFaqSchema>;
