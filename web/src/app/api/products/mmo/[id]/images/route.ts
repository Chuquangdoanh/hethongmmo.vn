import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";
import { listProductImages, addProductImage } from "@/lib/services/product-image.service";

export const runtime = "nodejs";

const createImageSchema = z.object({
  imageUrl: z.string().min(1, "Thiếu URL ảnh").max(2000, "URL ảnh quá dài"),
});

async function requireStaffAndProduct(productId: string, actorRole: string) {
  if (actorRole !== "STAFF" && actorRole !== "ADMIN") {
    return { product: null, code: "FORBIDDEN", status: 403 } as const;
  }
  const product = await prisma.mmoProduct.findUnique({
    where: { id: productId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!product) return { product: null, code: "NOT_FOUND", status: 404 } as const;
  return { product, code: null, status: 200 } as const;
}

// GET /api/products/mmo/[id]/images — chỉ STAFF/ADMIN
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const { product, code, status } = await requireStaffAndProduct(id, me.role);
    if (!product) {
      return NextResponse.json(
        { success: false, error: code === "NOT_FOUND" ? "Sản phẩm không tồn tại" : "Không có quyền", code },
        { status },
      );
    }

    const images = await listProductImages("MMO_PRODUCT", id);

    return NextResponse.json({ success: true, data: images });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// POST /api/products/mmo/[id]/images — chỉ STAFF/ADMIN
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const { product, code, status } = await requireStaffAndProduct(id, me.role);
    if (!product) {
      return NextResponse.json(
        { success: false, error: code === "NOT_FOUND" ? "Sản phẩm không tồn tại" : "Không có quyền", code },
        { status },
      );
    }

    const parsed = createImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const image = await addProductImage("MMO_PRODUCT", id, parsed.data.imageUrl);

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_IMAGE_CREATE",
      targetType: "ProductImage",
      targetId: image.id,
      after: { productId: id, imageUrl: image.imageUrl },
    });

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
