import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

// ── GET — Danh sách stock items (staff/admin only) ────────────────────────────

/**
 * GET /api/products/mmo/[id]/stock
 * Xem metadata của stock items — không decrypt valueEnc.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id } = await params;

    // Verify product tồn tại
    const product = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Query params
    const { searchParams } = req.nextUrl;
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",   10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const statusFilter = searchParams.get("status") as "AVAILABLE" | "SOLD" | "RESERVED" | null;

    const allowedStatuses = ["AVAILABLE", "SOLD", "RESERVED"] as const;
    const statusWhere = statusFilter && (allowedStatuses as readonly string[]).includes(statusFilter)
      ? { status: statusFilter }
      : {};

    const where = { productId: id, ...statusWhere };
    const skip = (page - 1) * limit;

    const [items, total, available, sold, reserved] = await Promise.all([
      prisma.mmoProductItem.findMany({
        where,
        select: { id: true, productId: true, status: true, soldToUserId: true, soldAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mmoProductItem.count({ where }),
      prisma.mmoProductItem.count({ where: { productId: id, status: "AVAILABLE" } }),
      prisma.mmoProductItem.count({ where: { productId: id, status: "SOLD" } }),
      prisma.mmoProductItem.count({ where: { productId: id, status: "RESERVED" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      stats: { available, sold, reserved },
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — Thêm stock items (batch) ──────────────────────────────────────────

const addStockSchema = z.object({
  items: z
    .array(z.string().min(1, "Item không được rỗng").max(10_000, "Item quá dài").trim())
    .min(1, "Phải có ít nhất 1 item")
    .max(500, "Tối đa 500 items mỗi lần upload"),
});

/**
 * POST /api/products/mmo/[id]/stock
 * Thêm hàng loạt stock items (mã hóa từng item riêng biệt).
 * Deduplicate trong input; encrypt mỗi item với nonce riêng.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = addStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // Verify product tồn tại, active, chưa bị xóa
    const product = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, isActive: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm hiện không hoạt động", code: "ITEM_INACTIVE" },
        { status: 400 },
      );
    }

    // Deduplicate trong input (giữ thứ tự xuất hiện đầu tiên)
    const unique = [...new Set(parsed.data.items.map((i) => i.trim()).filter(Boolean))];

    // Encrypt từng item riêng biệt (mỗi item có nonce AES-GCM riêng)
    const records = unique.map((value) => ({
      productId: id,
      valueEnc: encrypt(value) as unknown as Uint8Array<ArrayBuffer>,
      status: "AVAILABLE" as const,
    }));

    await prisma.mmoProductItem.createMany({ data: records });

    // Query số lượng AVAILABLE sau insert
    const totalAvailable = await prisma.mmoProductItem.count({
      where: { productId: id, status: "AVAILABLE" },
    });

    logger.info({ productId: id, count: records.length, staffId: actor.id }, "MMO stock added");

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_STOCK_ADD",
      targetType: "MmoProduct",
      targetId: id,
      after: { count: records.length },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          inserted: records.length,
          skipped: parsed.data.items.length - unique.length,
          totalAvailable,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── DELETE — Xóa items chưa bán (bulk hard delete) ───────────────────────────

const deleteStockSchema = z.object({
  itemIds:       z.array(z.string().uuid()).min(1).max(100),
  confirmDelete: z.literal(true),
});

/**
 * DELETE /api/products/mmo/[id]/stock
 * Admin xóa vĩnh viễn các stock items chưa bán.
 * Không cho phép xóa item đã SOLD.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = deleteStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { itemIds } = parsed.data;

    // IDOR: verify tất cả itemIds thuộc đúng productId
    const items = await prisma.mmoProductItem.findMany({
      where: { id: { in: itemIds }, productId: id },
      select: { id: true, status: true },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Một số item không tồn tại hoặc không thuộc sản phẩm này",
          code: "NOT_FOUND",
        },
        { status: 400 },
      );
    }

    // Không cho phép xóa item đã SOLD
    const soldItems = items.filter((i) => i.status === "SOLD");
    if (soldItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${soldItems.length} item đã được bán, không thể xóa`,
          code: "HAS_SOLD_ITEMS",
        },
        { status: 400 },
      );
    }

    // Hard delete — items chưa bán không cần soft delete
    await prisma.mmoProductItem.deleteMany({
      where: { id: { in: itemIds }, productId: id },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_STOCK_DELETE",
      targetType: "MmoProduct",
      targetId: id,
      before: { deletedCount: itemIds.length },
    });

    return NextResponse.json({ success: true, data: { deleted: itemIds.length } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
