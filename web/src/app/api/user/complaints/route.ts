import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { sendComplaintCreatedToSellerEmail } from "@/lib/services/email.service";

export const runtime = "nodejs";

const createComplaintSchema = z.object({
  subject: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(2000).trim(),
  orderId: z.string().uuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { subject, content, orderId } = parsed.data;

    // Validate order: phải thuộc user, phải là SELLER_PRODUCT, chưa quá 24h
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: me.id },
      select: {
        orderType: true,
        status: true,
        createdAt: true,
        sellerProduct: { select: { seller: { select: { id: true, email: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Đơn hàng không tồn tại hoặc không thuộc về bạn.", code: "ORDER_NOT_FOUND" },
        { status: 400 },
      );
    }

    if (order.orderType !== "SELLER_PRODUCT") {
      return NextResponse.json(
        { error: "Chỉ đơn hàng sản phẩm nhà bán hàng mới hỗ trợ khiếu nại.", code: "COMPLAINT_NOT_ALLOWED" },
        { status: 400 },
      );
    }

    if (Date.now() - order.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Đã quá 24 giờ kể từ khi mua hàng, không thể khiếu nại.", code: "COMPLAINT_WINDOW_EXPIRED" },
        { status: 400 },
      );
    }

    // Đơn hàng đã có khiếu nại chưa?
    const existing = await prisma.complaint.findFirst({
      where: { orderId, userId: me.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Đơn hàng này đã có khiếu nại đang xử lý.", code: "COMPLAINT_ALREADY_EXISTS" },
        { status: 409 },
      );
    }

    // Prevent spam: max 5 đang mở
    const openCount = await prisma.complaint.count({
      where: { userId: me.id, status: "IN_REVIEW" },
    });
    if (openCount >= 5) {
      return NextResponse.json(
        { error: "Bạn đang có 5 khiếu nại chưa giải quyết. Vui lòng chờ admin xử lý.", code: "TOO_MANY_COMPLAINTS" },
        { status: 429 },
      );
    }

    const seller = order.sellerProduct?.seller ?? null;

    // Transaction: tạo complaint + freeze order + tạo chat room ngay
    const complaint = await prisma.$transaction(async (tx) => {
      // Treo tiền ngay
      await tx.order.update({ where: { id: orderId }, data: { status: "FROZEN" } });

      // Tạo complaint trực tiếp với IN_REVIEW
      const c = await tx.complaint.create({
        data: { userId: me.id, subject, content, orderId, status: "IN_REVIEW" },
        select: { id: true, subject: true, status: true, createdAt: true },
      });

      // Tạo ChatRoom + participants (User + Seller)
      const participants: { userId: string; label: string }[] = [
        { userId: me.id, label: "Người mua" },
      ];
      if (seller && seller.id !== me.id) {
        participants.push({ userId: seller.id, label: "Nhà bán hàng" });
      }

      await tx.chatRoom.create({
        data: {
          complaintId: c.id,
          participants: { create: participants },
        },
      });

      return c;
    });

    // Email seller bắt buộc hỗ trợ trong 12h
    if (seller?.email) {
      sendComplaintCreatedToSellerEmail({
        to: seller.email,
        subject,
        complaintId: complaint.id,
      }).catch(() => {});
    }

    return apiOk(complaint, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
