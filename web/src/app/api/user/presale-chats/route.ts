import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { createPreSaleChatSchema } from "@/lib/validation/pre-sale-chat.schema";
import { getOrCreatePreSaleChat } from "@/lib/services/pre-sale-chat.service";

export const runtime = "nodejs";

/* POST — buyer mở (hoặc lấy lại) chat tư vấn với 1 seller trước khi mua hàng */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createPreSaleChatSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const chat = await getOrCreatePreSaleChat(me.id, parsed.data.sellerId);
    return apiOk(chat);
  } catch (err) {
    return apiCatch(err);
  }
}
