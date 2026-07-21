import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { apiSuccess, apiCatch } from "@/lib/api-response";
import { resolvePartnerThread } from "@/lib/services/partner-support.service";

export const runtime = "nodejs";

// POST — admin/staff đóng cuộc trò chuyện (không hoàn tiền)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    const { id } = await params;

    await resolvePartnerThread(id, me.id);
    return apiSuccess("Đã đóng cuộc trò chuyện");
  } catch (err) {
    return apiCatch(err);
  }
}
