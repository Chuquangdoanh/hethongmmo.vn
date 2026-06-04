import { z } from "zod";

export const savePermissionsSchema = z.object({
  role: z.enum(["USER", "SELLER", "STAFF"]),
  permissions: z.record(z.string(), z.boolean()),
});

export type SavePermissionsInput = z.infer<typeof savePermissionsSchema>;
