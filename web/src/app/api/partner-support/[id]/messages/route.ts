import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import {
  assertPartnerThreadAccess,
  getPartnerThreadSnapshot,
  postPartnerMessage,
} from "@/lib/services/partner-support.service";

export const runtime = "nodejs";

// GET — poll snapshot (tin nhắn + trạng thái). Buyer hoặc admin/staff đều xem được.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    await assertPartnerThreadAccess(id, me.id, me.role);

    const afterStr = req.nextUrl.searchParams.get("after");
    const after = afterStr ? new Date(afterStr) : null;

    const snapshot = await getPartnerThreadSnapshot(id, after);
    if (!snapshot) return apiValidationError([{ message: "Không tìm thấy cuộc trò chuyện" }]);

    return apiOk(snapshot);
  } catch (err) {
    return apiCatch(err);
  }
}

const sendSchema = z.object({ content: z.string().min(1).max(2000).trim() });

// POST — gửi tin. Admin/staff gửi dưới danh nghĩa gian hàng (PROVIDER).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const { threadRole, providerName } = await assertPartnerThreadAccess(id, me.id, me.role);

    const body: unknown = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const message = await postPartnerMessage(id, me.id, threadRole, providerName, parsed.data.content);
    return apiOk(message, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
