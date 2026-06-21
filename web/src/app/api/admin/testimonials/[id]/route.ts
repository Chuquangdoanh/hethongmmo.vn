import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  type:             z.enum(["COURSE", "SERVICE"]).optional(),
  courseId:         z.string().uuid().nullable().optional(),
  serviceId:        z.string().uuid().nullable().optional(),
  category:         z.string().max(100).nullable().optional(),
  reviewerName:     z.string().min(1).max(100).optional(),
  reviewerRole:     z.string().max(100).nullable().optional(),
  reviewerAvatar:   z.string().url().nullable().optional(),
  reviewerInitials: z.string().max(5).nullable().optional(),
  reviewerColor:    z.string().max(20).nullable().optional(),
  content:          z.string().min(1).max(2000).optional(),
  rating:           z.number().int().min(1).max(5).optional(),
  isActive:         z.boolean().optional(),
  displayOrder:     z.number().int().min(0).optional(),
});

// ── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy", code: "NOT_FOUND" }, { status: 404 });
    }

    const d = parsed.data;
    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        ...d,
        ...(d.type === "SERVICE" ? { courseId:  null } : {}),
        ...(d.type === "COURSE"  ? { serviceId: null } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:delete");
    const { id } = await params;

    const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Đã xóa đánh giá" });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
