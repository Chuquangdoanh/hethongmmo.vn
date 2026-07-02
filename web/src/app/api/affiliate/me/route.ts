import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";
import { buildReferralLink } from "@/lib/services/affiliate.service";
import { APP_URL } from "@/config/env";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { affiliateCode: true, affiliateStatus: true, isAffiliate: true, affiliateJoinedAt: true },
    });
    if (!user?.isAffiliate || !user.affiliateCode) {
      return apiError("Tài khoản chưa được cấp quyền Affiliate", "NOT_AFFILIATE", 403);
    }

    const referralLink = buildReferralLink(user.affiliateCode, APP_URL);
    const qrDataUrl = await QRCode.toDataURL(referralLink);

    return apiOk({
      affiliateCode: user.affiliateCode,
      affiliateStatus: user.affiliateStatus,
      affiliateJoinedAt: user.affiliateJoinedAt,
      referralLink,
      qrDataUrl,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
