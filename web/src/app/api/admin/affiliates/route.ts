import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { paginationSchema, grantAffiliateSchema } from "@/lib/validation/affiliate.schema";
import { grantAffiliateAccess } from "@/lib/services/affiliate.service";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const querySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { page, limit, search } = parsed.data;

    const where = {
      isAffiliate: true,
      ...(search
        ? { OR: [{ fullName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
        : {}),
    };

    const [affiliates, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, email: true, affiliateCode: true, affiliateStatus: true, affiliateJoinedAt: true,
          _count: { select: { referredUsers: true, affiliateCommissionsEarned: true } },
        },
        orderBy: { affiliateJoinedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return apiList(affiliates, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = grantAffiliateSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await grantAffiliateAccess(parsed.data.userId);

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_ACCESS_GRANTED",
      targetType: "User",
      targetId: parsed.data.userId,
      after: { affiliateCode: result.affiliateCode },
    });

    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
