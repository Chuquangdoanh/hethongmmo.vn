import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser, requireStaff } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ["PROCESSING", "CANCELLED"],
  PROCESSING: ["DONE", "CANCELLED", "DISPUTED"],
  DONE:       ["REFUNDED", "DISPUTED"],
  CANCELLED:  [],
  REFUNDED:   [],
  DISPUTED:   ["DONE", "REFUNDED", "CANCELLED"],
};

const patchSchema = z.object({
  status: z.enum(["PROCESSING", "DONE", "CANCELLED", "REFUNDED", "DISPUTED"]),
  note: z.string().max(500).optional(),
});

// ── GET — Delivered content (for download/copy on order list) ───────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        userId: true,
        orderCode: true,
        orderType: true,
        status: true,
        deliveredItemId: true,
        tutTrickContentUrlEnc: true,
        tutTrickDocs: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Không tìm thấy", code: "NOT_FOUND" }, { status: 404 });
    }
    if (order.userId !== me.id) {
      return NextResponse.json({ success: false, error: "Không có quyền", code: "FORBIDDEN" }, { status: 403 });
    }
    if (order.status !== "DONE") {
      return NextResponse.json({ success: true, data: { deliveredContent: null, orderCode: order.orderCode } });
    }

    let deliveredContent: string | null = null;
    if (order.deliveredItemId) {
      if (order.orderType === "MMO_PRODUCT") {
        const item = await prisma.mmoProductItem.findUnique({
          where: { id: order.deliveredItemId },
          select: { valueEnc: true },
        });
        deliveredContent = item ? decrypt(item.valueEnc as unknown as Buffer) : null;
      } else if (order.orderType === "SELLER_PRODUCT") {
        const stock = await prisma.sellerProductStock.findUnique({
          where: { id: order.deliveredItemId },
          select: { contentEnc: true },
        });
        deliveredContent = stock ? decrypt(stock.contentEnc as unknown as Buffer) : null;
      }
    }
    if (order.orderType === "TUTTRICK" && order.tutTrickContentUrlEnc) {
      deliveredContent = decrypt(order.tutTrickContentUrlEnc as unknown as Buffer);
    }

    return NextResponse.json({
      success: true,
      data: {
        deliveredContent,
        tutTrickDocs: order.orderType === "TUTTRICK" ? (order.tutTrickDocs ?? null) : null,
        orderCode: order.orderCode,
      },
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── PATCH — Update order status (Staff+) ────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { status: newStatus, note } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderCode: true,
        userId: true,
        orderType: true,
        status: true,
        finalPrice: true,
        serviceId: true,
        sellerProductId: true,
        sellerId: true,
      },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Đơn hàng không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const allowed = ALLOWED_TRANSITIONS[order.status as string] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể chuyển trạng thái từ ${order.status} sang ${newStatus}`,
          code: "INVALID_TRANSITION",
        },
        { status: 400 },
      );
    }

    const orderSelect = { id: true, orderCode: true, status: true } as const;
    let updated: { id: string; orderCode: string; status: string };

    if (newStatus === "DONE") {
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.order.update({
          where: { id },
          data: { status: newStatus, completedAt: new Date() },
          select: orderSelect,
        });

        if (order.orderType === "SERVICE" && order.serviceId) {
          await tx.service.update({
            where: { id: order.serviceId },
            data: { totalOrders: { increment: 1 } },
          });
        }

        if (order.sellerId && order.sellerProductId) {
          await tx.sellerProduct.update({
            where: { id: order.sellerProductId },
            data: { revenue: { increment: order.finalPrice } },
          });
        }

        return result;
      });
    } else if (newStatus === "REFUNDED") {
      updated = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ balance: string }>>`
          SELECT balance::text FROM users WHERE id = ${order.userId}::uuid FOR UPDATE
        `;
        const balanceBefore = parseFloat(rows[0]?.balance ?? "0");
        const refundAmount = Number(order.finalPrice);
        const balanceAfter = balanceBefore + refundAmount;

        await tx.user.update({
          where: { id: order.userId },
          data: { balance: balanceAfter },
        });

        await tx.transaction.create({
          data: {
            userId: order.userId,
            orderId: id,
            type: "REFUND",
            amount: refundAmount,
            description: `Hoàn tiền đơn hàng ${order.orderCode}`,
            balanceBefore,
            balanceAfter,
          },
        });

        return await tx.order.update({
          where: { id },
          data: { status: newStatus },
          select: orderSelect,
        });
      });
    } else {
      updated = await prisma.order.update({
        where: { id },
        data: { status: newStatus },
        select: orderSelect,
      });
    }

    await writeAuditLog({
      actorId: actor.id,
      action: "ORDER_STATUS_UPDATE",
      targetType: "Order",
      targetId: id,
      before: { status: order.status as string },
      after: {
        status: newStatus,
        ...(note ? { note } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    return NextResponse.json(
      { success: false, error: e.error, code: e.code },
      { status: e.statusCode },
    );
  }
}
