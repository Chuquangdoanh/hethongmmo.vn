import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id: affiliateId, customerId } = await params;

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { referrerAffiliateId: true },
    });
    if (!customer || customer.referrerAffiliateId !== affiliateId) {
      return apiError("Khách hàng không thuộc Affiliate này", "NOT_FOUND", 404);
    }

    const orders = await prisma.order.findMany({
      where: { userId: customerId },
      select: {
        id: true, orderCode: true, orderType: true, itemName: true,
        finalPrice: true, status: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return apiOk(orders);
  } catch (err) {
    return apiCatch(err);
  }
}
