import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { paginationSchema } from "@/lib/validation/affiliate.schema";
import { requestAffiliateWithdrawal } from "@/lib/services/affiliate-withdrawal.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const parsed = paginationSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit } = parsed.data;

    const where = { affiliateId: me.id };
    const [withdrawals, total] = await Promise.all([
      prisma.affiliateWithdrawal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.affiliateWithdrawal.count({ where }),
    ]);

    return apiList(withdrawals, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const result = await requestAffiliateWithdrawal({ affiliateId: me.id });
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
