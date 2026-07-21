import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { openPartnerSupportThread } from "@/lib/services/partner-support.service";

export const runtime = "nodejs";

const openSchema = z.object({
  orderId: z.string().uuid(),
  subject: z.string().min(1).max(200).trim(),
  content: z.string().min(5, "Mô tả tối thiểu 5 ký tự").max(2000).trim(),
});

// POST — buyer mở (hoặc lấy lại) chat hỗ trợ với gian hàng đối tác cho 1 đơn
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = openSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const thread = await openPartnerSupportThread(
      me.id,
      parsed.data.orderId,
      parsed.data.subject,
      parsed.data.content,
    );
    return apiOk(thread);
  } catch (err) {
    return apiCatch(err);
  }
}
