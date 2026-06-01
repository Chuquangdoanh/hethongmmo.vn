import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { requestWithdrawal } from "@/lib/services/withdrawal.service";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const withdrawalSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, "Cần ít nhất 1 đơn hàng"),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      prisma.sellerWithdrawal.findMany({
        where: { sellerId: me.id },
        select: {
          id: true,
          amount: true,
          feePercent: true,
          feeAmount: true,
          netAmount: true,
          status: true,
          rejectReason: true,
          createdAt: true,
          processedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sellerWithdrawal.count({ where: { sellerId: me.id } }),
    ]);

    return NextResponse.json({ data: withdrawals, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }

    type ShopRow = { shop_locked: boolean };
    const shopRows = await prisma.$queryRaw<ShopRow[]>`SELECT shop_locked FROM users WHERE id = ${me.id}`;
    if (shopRows[0]?.shop_locked) {
      return NextResponse.json({ error: "Gian hàng đang bị khóa, không thể rút tiền", code: "SHOP_LOCKED" }, { status: 403 });
    }

    const body: unknown = await req.json();
    const parsed = withdrawalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    const result = await requestWithdrawal({ sellerId: me.id, orderIds: parsed.data.orderIds, ip });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
