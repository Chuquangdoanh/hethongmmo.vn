import { z } from "zod";

export const createServiceCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  iconUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
