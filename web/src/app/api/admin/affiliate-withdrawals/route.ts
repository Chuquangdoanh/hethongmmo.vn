import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { paginationSchema } from "@/lib/validation/affiliate.schema";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = paginationSchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED"]).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit, status } = parsed.data;

    const where = status ? { status } : {};
    const [withdrawals, total] = await Promise.all([
      prisma.affiliateWithdrawal.findMany({
        where,
        include: { affiliate: { select: { fullName: true, email: true, affiliateCode: true } } },
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
