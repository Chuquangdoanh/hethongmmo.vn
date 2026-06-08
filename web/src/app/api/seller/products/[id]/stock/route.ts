import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const addStockSchema = z.object({
  items: z
    .array(z.string().min(1).max(2000))
    .min(1, "Cần ít nhất 1 item")
    .max(200, "Tối đa 200 items mỗi lần"),
});

const PAGE_SIZE = 30;

// ── GET — List stock items (decrypted) ──────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);

    const rawStatus = req.nextUrl.searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));

    const statusFilter =
      rawStatus === "AVAILABLE" ? { status: "AVAILABLE" as const } :
      rawStatus === "SOLD"      ? { status: "SOLD" as const } :
      {};

    const where = { productId: id, ...statusFilter };

    const [rows, total] = await Promise.all([
      prisma.sellerProductStock.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          contentEnc: true,
          status: true,
          soldAt: true,
          createdAt: true,
        },
      }),
      prisma.sellerProductStock.count({ where }),
    ]);

    const items = rows.map((r) => {
      let content = "[Không thể đọc nội dung]";
      try { content = decrypt(r.contentEnc as unknown as Buffer); } catch { /* decrypt failure */ }
      return {
        id: r.id,
        content,
        status: r.status,
        soldAt: r.soldAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return apiOk({
      items,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    return apiCatch(err);
  }
}

// ── POST — Add stock items ───────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = addStockSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    // IDOR: only seller who owns the product
    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true, isRestricted: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);
    if (product.isRestricted) return apiError("Sản phẩm đang bị hạn chế", "RESTRICTED", 403);

    const encryptedItems = parsed.data.items.map((item) => ({
      productId: id,
      contentEnc: encrypt(item) as unknown as Uint8Array<ArrayBuffer>,
    }));

    const result = await prisma.sellerProductStock.createMany({ data: encryptedItems });

    return apiOk({ addedCount: result.count });
  } catch (err) {
    return apiCatch(err);
  }
}
