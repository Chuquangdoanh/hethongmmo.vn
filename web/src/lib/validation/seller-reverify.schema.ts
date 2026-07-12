import { z } from "zod";

export const submitSellerReverifySchema = z.object({
  cccdImageUrl:     z.string().min(1, "Vui lòng upload ảnh CCCD/CMND").max(500),
  portraitImageUrl: z.string().min(1, "Vui lòng upload ảnh chân dung").max(500),
});

export type SubmitSellerReverifyInput = z.infer<typeof submitSellerReverifySchema>;

export const reviewSellerReverifySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), rejectReason: z.string().min(5, "Cần ghi lý do từ chối").max(500).trim() }),
]);

export type ReviewSellerReverifyInput = z.infer<typeof reviewSellerReverifySchema>;
