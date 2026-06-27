import { z } from "zod";

export const depositEscrowSchema = z.object({
  amount: z
    .number()
    .int("Số tiền phải là số nguyên")
    .min(10_000, "Số tiền tối thiểu 10.000đ")
    .max(100_000_000, "Số tiền tối đa 100.000.000đ"),
});

export type DepositEscrowInput = z.infer<typeof depositEscrowSchema>;
