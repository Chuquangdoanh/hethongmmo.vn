import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { createCommissionRuleSchema } from "@/lib/validation/affiliate.schema";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const rules = await prisma.affiliateCommissionRule.findMany({
      include: { affiliate: { select: { fullName: true, email: true, affiliateCode: true } } },
      orderBy: [{ affiliateId: "asc" }, { createdAt: "desc" }],
    });
    return apiOk(rules);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createCommissionRuleSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const rule = await prisma.affiliateCommissionRule.create({
      data: {
        affiliateId: parsed.data.affiliateId,
        orderType: parsed.data.orderType,
        commissionPercent: parsed.data.commissionPercent,
        priority: parsed.data.priority,
      },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_COMMISSION_RULE_CREATED",
      targetType: "AffiliateCommissionRule",
      targetId: rule.id,
      after: parsed.data,
    });

    return apiOk(rule);
  } catch (err) {
    return apiCatch(err);
  }
}
