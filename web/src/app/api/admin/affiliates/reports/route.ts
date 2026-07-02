import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const from = parsed.data.from ? new Date(parsed.data.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = parsed.data.to ? new Date(parsed.data.to) : new Date();

    const rows = await prisma.$queryRaw<Array<{ day: Date; order_count: bigint; commission_amount: string }>>`
      SELECT date_trunc('day', created_at) AS day,
             COUNT(*) AS order_count,
             COALESCE(SUM(amount), 0) AS commission_amount
      FROM affiliate_commissions
      WHERE created_at BETWEEN ${from} AND ${to} AND status != 'VOIDED'
      GROUP BY day
      ORDER BY day ASC
    `;

    return apiOk(
      rows.map((r) => ({
        day: r.day,
        orderCount: Number(r.order_count),
        commissionAmount: Number(r.commission_amount),
      })),
    );
  } catch (err) {
    return apiCatch(err);
  }
}
