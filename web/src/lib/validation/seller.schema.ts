import { z } from "zod";

export const sellerProductSchema = z.object({
  name: z.string().min(3).max(500).trim(),
  price: z.number().positive().max(100_000_000),
  warrantyInfo: z.string().min(1, "Thông tin bảo hành không được để trống").max(2000).trim(),
  description: z.string().max(5000).trim().optional(),
  stockItems: z.array(z.string().min(1).max(2000)).min(1).max(100),
});

export const withdrawalSchema = z.object({
  amount: z.number().min(200_000, "Tối thiểu 200.000đ"),
});

export type SellerProductInput = z.infer<typeof sellerProductSchema>;
