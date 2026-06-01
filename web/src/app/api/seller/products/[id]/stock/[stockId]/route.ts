import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const editSchema = z.object({
  content: z.string().min(1, "Nội dung không được trống").max(2000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stockId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id, stockId } = await params;

    // IDOR: verify product belongs to seller
    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true, isRestricted: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);
    if (product.isRestricted) return apiError("Sản phẩm đang bị hạn chế", "RESTRICTED", 403);

    const stock = await prisma.sellerProductStock.findFirst({
      where: { id: stockId, productId: id },
      select: { id: true, status: true },
    });
    if (!stock) return apiError("Item không tồn tại", "NOT_FOUND", 404);
    if (stock.status !== "AVAILABLE") {
      return apiError("Chỉ có thể sửa item chưa bán", "FORBIDDEN", 403);
    }

    const body: unknown = await req.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await prisma.sellerProductStock.update({
      where: { id: stockId },
      data: { contentEnc: encrypt(parsed.data.content) as unknown as Uint8Array<ArrayBuffer> },
    });

    return apiOk({ id: stockId });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stockId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id, stockId } = await params;

    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);

    const stock = await prisma.sellerProductStock.findFirst({
      where: { id: stockId, productId: id },
      select: { id: true, status: true },
    });
    if (!stock) return apiError("Item không tồn tại", "NOT_FOUND", 404);
    if (stock.status !== "AVAILABLE") {
      return apiError("Chỉ có thể xóa item chưa bán", "FORBIDDEN", 403);
    }

    await prisma.sellerProductStock.delete({ where: { id: stockId } });

    return apiOk({ id: stockId });
  } catch (err) {
    return apiCatch(err);
  }
}
