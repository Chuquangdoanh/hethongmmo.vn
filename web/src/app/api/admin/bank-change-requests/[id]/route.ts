import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { reviewBankChangeRequestSchema } from "@/lib/validation/bank-change-request.schema";
import { reviewBankChangeRequest } from "@/lib/services/bank-change-request.service";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = reviewBankChangeRequestSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await reviewBankChangeRequest(
      id,
      me.id,
      parsed.data.action,
      parsed.data.action === "reject" ? parsed.data.rejectReason : undefined,
    );

    const msg = parsed.data.action === "approve"
      ? "Đã duyệt và cập nhật thông tin ngân hàng"
      : "Đã từ chối yêu cầu";
    return apiSuccess(msg);
  } catch (err) {
    return apiCatch(err);
  }
}
