import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { notifySellerProductRestricted, notifySellerProductApproval } from "@/lib/services/telegram-alert.service";

export const runtime = "nodejs";

const bulkSchema = z.object({
  action: z.enum(["RESTRICT", "REJECT", "OPEN"]),
  ids: z.array(z.string().uuid()).min(1).max(200),
  reason: z.string().max(500).trim().optional(),
}).refine((data) => data.action !== "REJECT" || !!data.reason, {
  message: "Cần nhập lý do khi từ chối sản phẩm",
  path: ["reason"],
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "seller_products:update");

    const body: unknown = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { action, ids, reason } = parsed.data;

    const products = await prisma.sellerProduct.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, sellerId: true, isRestricted: true, approvalStatus: true },
    });
    if (products.length === 0) return apiError("Không tìm thấy sản phẩm nào", "NOT_FOUND", 404);

    const foundIds = products.map((p) => p.id);

    if (action === "RESTRICT") {
      await prisma.sellerProduct.updateMany({
        where: { id: { in: foundIds } },
        data: { isRestricted: true },
      });
      for (const p of products) notifySellerProductRestricted(p.sellerId, p.name, true);
    } else if (action === "REJECT") {
      await prisma.sellerProduct.updateMany({
        where: { id: { in: foundIds } },
        data: { approvalStatus: "REJECTED", approvalRejectReason: reason },
      });
      for (const p of products) notifySellerProductApproval(p.sellerId, p.name, false, reason);
    } else {
      // OPEN — bỏ hạn chế + duyệt lại, đưa sản phẩm hiển thị lại trên gian hàng
      await prisma.sellerProduct.updateMany({
        where: { id: { in: foundIds } },
        data: { isRestricted: false, approvalStatus: "APPROVED", approvalRejectReason: null },
      });
      for (const p of products) {
        if (p.isRestricted) notifySellerProductRestricted(p.sellerId, p.name, false);
        if (p.approvalStatus !== "APPROVED") notifySellerProductApproval(p.sellerId, p.name, true);
      }
    }

    await writeAuditLog({
      actorId: me.id,
      action: `SELLER_PRODUCT_BULK_${action}`,
      targetType: "SellerProduct",
      targetId: foundIds.join(","),
      after: { ids: foundIds, count: foundIds.length, reason },
    });

    const actionLabel = action === "RESTRICT" ? "hạn chế" : action === "REJECT" ? "từ chối" : "mở";
    return apiSuccess(`Đã ${actionLabel} ${foundIds.length} sản phẩm`);
  } catch (err) {
    return apiCatch(err);
  }
}
