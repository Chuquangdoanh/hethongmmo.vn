import { z } from "zod";

export const savePublicPageConfigsSchema = z.object({
  configs: z.array(
    z.object({
      pageKey:     z.string().max(100),
      isVisible:   z.boolean(),
      isFeatured:  z.boolean(),
      customLabel: z.string().max(200).nullable(),
    }),
  ).min(1),
});

export type SavePublicPageConfigsInput = z.infer<typeof savePublicPageConfigsSchema>;

export const createPublicPageConfigSchema = z.object({
  pageKey: z.string()
    .min(1, "URL path không được để trống")
    .max(100)
    .regex(/^[a-z0-9\-\/]+$/, "Chỉ dùng chữ thường, số, dấu gạch ngang và dấu /"),
  label: z.string().min(1, "Tên trang không được để trống").max(200).trim(),
});

export type CreatePublicPageConfigInput = z.infer<typeof createPublicPageConfigSchema>;
