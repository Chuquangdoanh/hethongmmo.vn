import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const featureMatrixSchema = z.object({
  features: z.array(z.string().trim().min(1).max(200)).max(50),
  variantFlags: z.record(z.string().uuid(), z.array(z.boolean())),
});

// PATCH /api/products/mmo/[id]/feature-matrix — chỉ STAFF/ADMIN
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    if (me.role !== "STAFF" && me.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Không có quyền", code: "FORBIDDEN" }, { status: 403 });
    }

    const product = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "Sản phẩm không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const parsed = featureMatrixSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // Mọi variantId trong variantFlags phải thuộc đúng sản phẩm này
    const variantIds = Object.keys(parsed.data.variantFlags);
    if (variantIds.length > 0) {
      const validVariants = await prisma.mmoProductVariant.findMany({
        where: { id: { in: variantIds }, productId: id },
        select: { id: true },
      });
      if (validVariants.length !== variantIds.length) {
        return NextResponse.json(
          { success: false, error: "Gói sản phẩm không hợp lệ", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
    }

    await prisma.mmoProduct.update({
      where: { id },
      data: { packageFeatures: parsed.data },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "MMO_PRODUCT_FEATURE_MATRIX_UPDATE",
      targetType: "MmoProduct",
      targetId: id,
      after: { featureCount: parsed.data.features.length },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
