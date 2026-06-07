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
