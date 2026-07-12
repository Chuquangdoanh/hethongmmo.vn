import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { reviewSellerReverifySchema } from "@/lib/validation/seller-reverify.schema";
import { reviewSellerReverify } from "@/lib/services/seller-reverify.service";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "finance:approve");

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = reviewSellerReverifySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await reviewSellerReverify(
      id,
      me.id,
      parsed.data.action,
      parsed.data.action === "reject" ? parsed.data.rejectReason : undefined,
    );

    const msg = parsed.data.action === "approve"
      ? "Đã duyệt xác minh lại"
      : "Đã từ chối yêu cầu";
    return apiSuccess(msg);
  } catch (err) {
    return apiCatch(err);
  }
}
