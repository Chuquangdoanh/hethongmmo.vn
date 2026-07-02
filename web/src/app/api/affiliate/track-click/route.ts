import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiCatch } from "@/lib/api-response";
import { trackAffiliateClick } from "@/lib/services/affiliate.service";

export const runtime = "nodejs";

/** Called once client-side per new aff_ref cookie (see middleware.ts aff_ref_new marker). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const affiliateCode = req.cookies.get("aff_ref")?.value;
    if (affiliateCode) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
      const userAgent = req.headers.get("user-agent") ?? undefined;
      const landingPath = req.nextUrl.searchParams.get("path") ?? undefined;
      trackAffiliateClick({ affiliateCode, ipAddress: ip, userAgent, landingPath });
    }
    return apiSuccess();
  } catch (err) {
    return apiCatch(err);
  }
}
