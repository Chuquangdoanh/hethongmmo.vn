import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
});

/** Danh sách seller (đã duyệt) để admin chọn khi gắn coupon vào sản phẩm của 1 seller cụ thể. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) return apiValidationError(query.error.issues);
    const { q } = query.data;

    const rows = await prisma.user.findMany({
      where: {
        sellerStatus: "APPROVED",
        ...(q
          ? { OR: [{ fullName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        _count: { select: { sellerProducts: { where: { deletedAt: null } } } },
      },
      orderBy: { fullName: "asc" },
      take: 50,
    });

    return apiOk(rows.map((r) => ({ id: r.id, fullName: r.fullName, email: r.email, productCount: r._count.sellerProducts })));
  } catch (err) {
    return apiCatch(err);
  }
}
