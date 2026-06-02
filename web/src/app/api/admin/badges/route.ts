import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TxType } from "@prisma/client";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    // deposits: đếm trong 24h gần nhất để tránh hiển thị all-time total
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [orders, complaints, withdrawals, deposits] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { status: "OPEN" } }),
      prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
      prisma.transaction.count({
        where: {
          type: { in: [TxType.DEPOSIT_AUTO, TxType.DEPOSIT_MANUAL] },
          createdAt: { gt: since24h },
        },
      }),
    ]);

    return apiOk({ orders, complaints, withdrawals, deposits });
  } catch (err) {
    return apiCatch(err);
  }
}
