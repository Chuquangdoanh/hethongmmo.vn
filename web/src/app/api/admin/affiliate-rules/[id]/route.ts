import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { updateCommissionRuleSchema } from "@/lib/validation/affiliate.schema";
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
    const parsed = updateCommissionRuleSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const rule = await prisma.affiliateCommissionRule.update({ where: { id }, data: parsed.data });

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_COMMISSION_RULE_UPDATED",
      targetType: "AffiliateCommissionRule",
      targetId: id,
      after: parsed.data,
    });

    return apiOk(rule);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    const { id } = await params;

    const rule = await prisma.affiliateCommissionRule.delete({ where: { id } });

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_COMMISSION_RULE_DELETED",
      targetType: "AffiliateCommissionRule",
      targetId: id,
      before: rule,
    });

    return apiSuccess("Đã xóa rule hoa hồng");
  } catch (err) {
    return apiCatch(err);
  }
}
