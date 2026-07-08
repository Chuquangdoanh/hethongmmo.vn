import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { createSupportTicketSchema } from "@/lib/validation/support-ticket.schema";
import { getOrCreateSupportTicket } from "@/lib/services/support-ticket.service";

export const runtime = "nodejs";

/* POST — buyer mở (hoặc lấy lại) chat hỗ trợ cho 1 đơn hàng đã hết hạn khiếu nại */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createSupportTicketSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const ticket = await getOrCreateSupportTicket(me.id, parsed.data.orderId);
    return apiOk(ticket);
  } catch (err) {
    return apiCatch(err);
  }
}
