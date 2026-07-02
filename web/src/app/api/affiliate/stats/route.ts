import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { apiOk, apiCatch } from "@/lib/api-response";
import { getAffiliateStats } from "@/lib/services/affiliate.service";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);
    const stats = await getAffiliateStats(me.id);
    return apiOk(stats);
  } catch (err) {
    return apiCatch(err);
  }
}
