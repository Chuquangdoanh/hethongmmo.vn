import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const createVariantSchema = z.object({
  variantName:  z.string().min(2, "Tên gói tối thiểu 2 ký tự").max(100).trim().optional(),
  variantPrice: z.number().int("Giá phải là số nguyên").positive("Giá phải lớn hơn 0"),
  warranty:     z.string().min(1, "Bảo hành không được trống").max(50).trim(),
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

// GET /api/products/mmo/[id]/variants — chỉ STAFF/ADMIN
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

    const variants = await prisma.mmoProductVariant.findMany({
      where: { productId: id, deletedAt: null },
      select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true, isPopular: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: variants.map((v) => ({ ...v, variantPrice: Number(v.variantPrice) })),
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// POST /api/products/mmo/[id]/variants — chỉ STAFF/ADMIN
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

    const parsed = createVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const variant = await prisma.mmoProductVariant.create({
      data: {
        productId: id,
        variantName: parsed.data.variantName,
        variantPrice: parsed.data.variantPrice,
        warranty: parsed.data.warranty,
      },
      select: { id: true, variantName: true, variantPrice: true, warranty: true, isActive: true, createdAt: true },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_VARIANT_CREATE",
      targetType: "MmoProductVariant",
      targetId: variant.id,
      after: { productId: id, variantName: variant.variantName, variantPrice: Number(variant.variantPrice) },
    });

    return NextResponse.json(
      { success: true, data: { ...variant, variantPrice: Number(variant.variantPrice) } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
