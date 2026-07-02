import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { commissionActionSchema } from "@/lib/validation/affiliate.schema";
import { approveAffiliateCommission, adminVoidAffiliateCommission } from "@/lib/services/affiliate-commission.service";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = commissionActionSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    if (parsed.data.action === "APPROVE") {
      await approveAffiliateCommission(id, admin.id);
    } else {
      await adminVoidAffiliateCommission(id, parsed.data.reason ?? "Admin hủy hoa hồng");
    }

    await writeAuditLog({
      actorId: admin.id,
      action: parsed.data.action === "APPROVE" ? "AFFILIATE_COMMISSION_APPROVED" : "AFFILIATE_COMMISSION_VOIDED",
      targetType: "AffiliateCommission",
      targetId: id,
      after: { action: parsed.data.action, reason: parsed.data.reason },
    });

    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
