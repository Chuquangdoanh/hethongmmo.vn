import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  isRestricted: z.boolean(),
  restrictReason: z.string().max(500).trim().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "seller_products:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const product = await prisma.sellerProduct.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, isRestricted: true, sellerId: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);

    await prisma.sellerProduct.update({
      where: { id },
      data: { isRestricted: parsed.data.isRestricted },
    });

    await writeAuditLog({
      actorId: me.id,
      action: parsed.data.isRestricted ? "PRODUCT_RESTRICTED" : "PRODUCT_UNRESTRICTED",
      targetType: "SellerProduct",
      targetId: id,
      before: { isRestricted: product.isRestricted },
      after: { isRestricted: parsed.data.isRestricted, reason: parsed.data.restrictReason },
    });

    const action = parsed.data.isRestricted ? "hạn chế" : "bỏ hạn chế";
    return apiSuccess(`Đã ${action} sản phẩm "${product.name}"`);
  } catch (err) {
    return apiCatch(err);
  }
}
