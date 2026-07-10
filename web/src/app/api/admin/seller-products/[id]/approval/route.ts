import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { notifySellerProductApproval } from "@/lib/services/telegram-alert.service";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectReason: z.string().max(500).trim().optional(),
}).refine((data) => data.status !== "REJECTED" || !!data.rejectReason, {
  message: "Cần nhập lý do khi từ chối sản phẩm",
  path: ["rejectReason"],
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
      select: { id: true, name: true, approvalStatus: true, sellerId: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);

    const { status, rejectReason } = parsed.data;

    await prisma.sellerProduct.update({
      where: { id },
      data: {
        approvalStatus: status,
        approvalRejectReason: status === "REJECTED" ? rejectReason : null,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: status === "APPROVED" ? "SELLER_PRODUCT_APPROVED" : "SELLER_PRODUCT_REJECTED",
      targetType: "SellerProduct",
      targetId: id,
      before: { approvalStatus: product.approvalStatus },
      after: { approvalStatus: status, rejectReason },
    });

    notifySellerProductApproval(product.sellerId, product.name, status === "APPROVED", rejectReason);

    const action = status === "APPROVED" ? "duyệt" : "từ chối";
    return apiSuccess(`Đã ${action} sản phẩm "${product.name}"`);
  } catch (err) {
    return apiCatch(err);
  }
}
