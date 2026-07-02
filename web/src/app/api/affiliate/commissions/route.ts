import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { paginationSchema } from "@/lib/validation/affiliate.schema";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = paginationSchema.extend({
  status: z.enum(["PENDING", "APPROVED", "VOIDED"]).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit, status } = parsed.data;

    const where = { affiliateId: me.id, ...(status ? { status } : {}) };
    const [commissions, total] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where,
        include: { customer: { select: { fullName: true, email: true } } },
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
