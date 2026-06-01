import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      revenueTodayRows,
      pendingSellers,
      pendingWithdrawals,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({
        where: { status: "DONE", completedAt: { gte: todayStart } },
        _sum: { finalPrice: true },
      }),
      prisma.sellerRequest.count({ where: { status: "PENDING" } }),
      prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
    ]);

    return apiOk({
      ordersToday,
      revenueToday: Number(revenueTodayRows._sum.finalPrice ?? 0),
      pendingSellers,
      pendingWithdrawals,
      totalUsers,
      activeUsers,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
