import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { partnerRefund } from "@/lib/services/partner-support.service";

export const runtime = "nodejs";

const bodySchema = z.object({ reason: z.string().max(500).trim().optional() }).optional();

// POST — admin hoàn tiền cho khách (giữ status DONE, giữ doanh thu/lợi nhuận)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    let reason: string | undefined;
    try {
      const raw: unknown = await req.json();
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) return apiValidationError(parsed.error.issues);
      reason = parsed.data?.reason;
    } catch {
      // body rỗng — chấp nhận, dùng lý do mặc định
    }

    const refundedAmount = await partnerRefund(id, me.id, reason);
    return apiOk({ refundedAmount });
  } catch (err) {
    return apiCatch(err);
  }
}
