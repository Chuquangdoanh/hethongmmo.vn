import { z } from "zod";

export const createTutTrickCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  iconUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateTutTrickCategoryInput = z.infer<typeof createTutTrickCategorySchema>;
