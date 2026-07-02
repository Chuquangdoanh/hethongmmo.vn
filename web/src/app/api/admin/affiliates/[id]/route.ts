import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { updateAffiliateStatusSchema } from "@/lib/validation/affiliate.schema";
import { updateAffiliateStatus, getAffiliateStats, buildReferralLink } from "@/lib/services/affiliate.service";
import { writeAuditLog } from "@/lib/security/audit";
import { APP_URL } from "@/config/env";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id } = await params;

    const affiliate = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, phone: true,
        isAffiliate: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true,
        referredUsers: {
          select: { id: true, fullName: true, email: true, affiliateJoinedAt: true },
          orderBy: { affiliateJoinedAt: "desc" },
          take: 50,
        },
      },
    });
    if (!affiliate || !affiliate.isAffiliate) throw new NotFoundError("Affiliate");

    const stats = await getAffiliateStats(id);
    const referralLink = affiliate.affiliateCode ? buildReferralLink(affiliate.affiliateCode, APP_URL) : null;

    return apiOk({ ...affiliate, referralLink, stats });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = updateAffiliateStatusSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await updateAffiliateStatus(id, parsed.data);

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_STATUS_UPDATED",
      targetType: "User",
      targetId: id,
      after: parsed.data,
    });

    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
