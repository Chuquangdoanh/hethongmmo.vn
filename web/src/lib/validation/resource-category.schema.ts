import { z } from "zod";

export const createResourceCategorySchema = z.object({
  name:                z.string().min(1).max(100).trim(),
  iconUrl:             z.string().url().optional().or(z.literal("")),
  showInKhoTaiNguyen:  z.boolean().optional().default(false),
  showInTaiNguyenMmo:  z.boolean().optional().default(false),
});

export type CreateResourceCategoryInput = z.infer<typeof createResourceCategorySchema>;
