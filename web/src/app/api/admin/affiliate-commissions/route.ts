import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { affiliateCommissionListSchema } from "@/lib/validation/affiliate.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const parsed = affiliateCommissionListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit, status, affiliateId } = parsed.data;

    const where = {
      ...(status ? { status } : {}),
      ...(affiliateId ? { affiliateId } : {}),
    };

    const [commissions, total] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where,
        include: {
          affiliate: { select: { fullName: true, email: true, affiliateCode: true } },
          customer: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.affiliateCommission.count({ where }),
    ]);

    return apiList(commissions, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}
