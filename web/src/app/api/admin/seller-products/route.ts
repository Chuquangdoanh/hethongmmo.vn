import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiList, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "seller_products:read");

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const sellerId = sp.get("sellerId") ?? undefined;
    const restricted = sp.get("restricted");
    const approvalStatus = sp.get("approvalStatus");

    const where = {
      deletedAt: null as null,
      ...(sellerId ? { sellerId } : {}),
      ...(restricted === "1" ? { isRestricted: true } : restricted === "0" ? { isRestricted: false } : {}),
      ...(approvalStatus === "PENDING" || approvalStatus === "APPROVED" || approvalStatus === "REJECTED"
        ? { approvalStatus: approvalStatus as "PENDING" | "APPROVED" | "REJECTED" }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.sellerProduct.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true, name: true, price: true, isActive: true, sellerCategory: true,
          isRestricted: true, approvalStatus: true, approvalRejectReason: true, createdAt: true,
          seller: { select: { id: true, fullName: true, email: true } },
          _count: {
            select: {
              orders: true,
              stockItems: { where: { status: "AVAILABLE" } },
            },
          },
        },
      }),
      prisma.sellerProduct.count({ where }),
    ]);

    return apiList(products, { total, page, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    return apiCatch(err);
  }
}
