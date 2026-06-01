import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const createComplaintSchema = z.object({
  subject: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(2000).trim(),
  orderId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { subject, content, orderId } = parsed.data;

    // Block complaints for TUTTRICK orders + enforce 24h window
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId, userId: me.id },
        select: { orderType: true, createdAt: true },
      });
      if (order?.orderType === "TUTTRICK") {
        return NextResponse.json(
          { error: "Đơn hàng Tut & Trick không hỗ trợ khiếu nại.", code: "COMPLAINT_NOT_ALLOWED" },
          { status: 400 },
        );
      }
      if (order && Date.now() - order.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: "Đã quá 24 giờ kể từ khi mua hàng, không thể khiếu nại.", code: "COMPLAINT_WINDOW_EXPIRED" },
          { status: 400 },
        );
      }
    }

    // Prevent spam: max 5 open complaints per user
    const openCount = await prisma.complaint.count({
      where: { userId: me.id, status: "OPEN" },
    });
    if (openCount >= 5) {
      return NextResponse.json(
        { error: "Bạn đã có 5 khiếu nại đang mở. Vui lòng chờ admin xử lý.", code: "TOO_MANY_COMPLAINTS" },
        { status: 429 },
      );
    }

    const complaint = await prisma.complaint.create({
      data: { userId: me.id, subject, content, orderId: orderId ?? null },
      select: { id: true, subject: true, status: true, createdAt: true },
    });

    return apiOk(complaint, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
