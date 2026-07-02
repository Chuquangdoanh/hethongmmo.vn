import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { processAffiliateWithdrawalSchema } from "@/lib/validation/affiliate.schema";
import {
  processAffiliateWithdrawal,
  completeAffiliateWithdrawal,
} from "@/lib/services/affiliate-withdrawal.service";

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
    const parsed = processAffiliateWithdrawalSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    if (parsed.data.action === "APPROVE") {
      await processAffiliateWithdrawal({ withdrawalId: id, adminUserId: admin.id, approve: true });
    } else if (parsed.data.action === "REJECT") {
      await processAffiliateWithdrawal({
        withdrawalId: id,
        adminUserId: admin.id,
        approve: false,
        rejectReason: parsed.data.rejectReason,
      });
    } else {
      await completeAffiliateWithdrawal(id, admin.id);
    }

    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
