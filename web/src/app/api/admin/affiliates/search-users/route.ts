import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { q } = parsed.data;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { affiliateCode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, fullName: true, email: true, affiliateCode: true, isAffiliate: true,
      },
      orderBy: { fullName: "asc" },
      take: 10,
    });

    return apiOk(users);
  } catch (err) {
    return apiCatch(err);
  }
}
