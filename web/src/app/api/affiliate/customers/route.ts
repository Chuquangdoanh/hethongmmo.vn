import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { paginationSchema } from "@/lib/validation/affiliate.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const parsed = paginationSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit } = parsed.data;

    const where = { referrerAffiliateId: me.id };
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, fullName: true, email: true, affiliateJoinedAt: true, createdAt: true },
        orderBy: { affiliateJoinedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return apiList(customers, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}
