import { z } from "zod";

export const createBankChangeRequestSchema = z.object({
  bankName:          z.string().min(2, "Tên ngân hàng phải ít nhất 2 ký tự").max(100).trim(),
  bankAccountNumber: z.string().min(6, "Số tài khoản không hợp lệ").max(30).trim(),
  bankAccountHolder: z.string().min(2, "Tên chủ TK phải ít nhất 2 ký tự").max(100).trim().toUpperCase(),
});

export type CreateBankChangeRequestInput = z.infer<typeof createBankChangeRequestSchema>;

export const reviewBankChangeRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), rejectReason: z.string().min(5, "Cần ghi lý do từ chối").max(500).trim() }),
]);

export type ReviewBankChangeRequestInput = z.infer<typeof reviewBankChangeRequestSchema>;
