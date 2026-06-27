import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  content: z.string().min(1, "Nội dung không được rỗng").max(10_000, "Nội dung quá dài").trim(),
  force:   z.boolean().optional().default(false),
});

/**
 * PATCH /api/products/mmo/[id]/stock/[itemId]
 * Sửa nội dung 1 stock item. Nếu trùng với item khác trong kho → báo lỗi DUPLICATE_CONTENT.
 * force=true → bỏ qua cảnh báo trùng và lưu luôn.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:update");
    const { id, itemId } = await params;

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { content, force } = parsed.data;

    // Verify item thuộc đúng sản phẩm và chưa bán
    const item = await prisma.mmoProductItem.findUnique({
      where: { id: itemId },
      select: { id: true, productId: true, status: true, valueEnc: true },
    });

    if (!item || item.productId !== id) {
      return NextResponse.json(
        { success: false, error: "Item không tồn tại hoặc không thuộc sản phẩm này", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (item.status === "SOLD") {
      return NextResponse.json(
        { success: false, error: "Không thể sửa item đã được bán", code: "ALREADY_SOLD" },
        { status: 400 },
      );
    }

    // Kiểm tra nội dung có thay đổi không
    let currentContent = "";
    try { currentContent = decrypt(item.valueEnc as Buffer); } catch { /* ignore */ }
    if (currentContent === content) {
      return NextResponse.json(
        { success: false, error: "Nội dung không có gì thay đổi", code: "NO_CHANGE" },
        { status: 400 },
      );
    }

    // Kiểm tra trùng với kho (nếu chưa force)
    if (!force) {
      const allItems = await prisma.mmoProductItem.findMany({
        where: { productId: id, id: { not: itemId } },
        select: { id: true, valueEnc: true },
      });

      for (const existing of allItems) {
        let existingContent = "";
        try { existingContent = decrypt(existing.valueEnc as Buffer); } catch { continue; }
        if (existingContent === content) {
          return NextResponse.json(
            {
              success: false,
              error: "Nội dung này đã tồn tại trong kho. Xác nhận nếu muốn tiếp tục.",
              code: "DUPLICATE_CONTENT",
              data: { duplicateItemId: existing.id },
            },
            { status: 409 },
          );
        }
      }
    }

    const before = currentContent;
    await prisma.mmoProductItem.update({
      where: { id: itemId },
      data: { valueEnc: encrypt(content) as unknown as Uint8Array<ArrayBuffer> },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_STOCK_EDIT",
      targetType: "MmoProductItem",
      targetId: itemId,
      before: { content: before.slice(0, 100) },
      after:  { content: content.slice(0, 100) },
    });

    return NextResponse.json({ success: true, data: { updated: 1 } });
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

/**
 * DELETE /api/products/mmo/[id]/stock/[itemId]
 * Xóa 1 stock item chưa bán. Item bị xóa → số lượng AVAILABLE giảm tự động.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:update");
    const { id, itemId } = await params;

    const item = await prisma.mmoProductItem.findUnique({
      where: { id: itemId },
      select: { id: true, productId: true, status: true },
    });

    if (!item || item.productId !== id) {
      return NextResponse.json(
        { success: false, error: "Item không tồn tại hoặc không thuộc sản phẩm này", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (item.status === "SOLD") {
      return NextResponse.json(
        { success: false, error: "Không thể xóa item đã được bán", code: "ALREADY_SOLD" },
        { status: 400 },
      );
    }

    await prisma.mmoProductItem.delete({ where: { id: itemId } });

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_STOCK_DELETE_SINGLE",
      targetType: "MmoProductItem",
      targetId: itemId,
      before: { productId: id, status: item.status },
    });

    return NextResponse.json({ success: true, data: { deleted: 1 } });
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
