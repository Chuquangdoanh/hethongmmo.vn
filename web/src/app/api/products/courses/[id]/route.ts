import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const coursePatchSchema = z
  .object({
    name: z.string().min(3).max(255).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(200).optional(),
    thumbnail: z.string().url().optional(),
    description: z.string().max(10_000).optional(),
    category: z.string().min(1).max(100).optional(),
    learningFormat: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
    originalPrice: z.number().positive().max(500_000_000).optional(),
    salePrice: z.number().min(0).max(500_000_000).optional(),
    duration: z.string().max(100).optional(),
    studentCount: z.number().int().min(0).optional(),
    rating: z.number().min(0).max(5).optional(),
    instructorName: z.string().max(200).optional(),
    contentList: z.array(z.string().max(20000)).max(100).optional(),
    platformVariants: z.array(z.object({
      name: z.string().min(1).max(100),
      icon: z.string().max(50).default(""),
    })).max(20).optional(),
    totalViews: z.number().int().min(0).optional(),
    totalOrders: z.number().int().min(0).optional(),
    badge: z.enum(["NONE", "HOT", "POPULAR", "TREND", "NEW", "VIP"]).optional(),
    saleDeadline: z.string().datetime().nullable().optional(),
    youtubeUrl: z.string().url().optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: z.string().max(500).optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    requiresAccountType: z.boolean().optional(),
    requiresCccd: z.boolean().optional(),
    commitments: z.array(z.string().max(500)).max(20).optional(),
    registrationProcedure: z.string().max(5000).nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.salePrice !== undefined && d.originalPrice !== undefined) {
        return d.salePrice <= d.originalPrice;
      }
      return true;
    },
    { message: "Giá bán phải nhỏ hơn hoặc bằng giá gốc", path: ["salePrice"] },
  );

// ── PATCH — Update course (Staff+) ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "courses:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = coursePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, slug: true, name: true, originalPrice: true, salePrice: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Khoá học không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const data = parsed.data;

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.course.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (slugConflict) {
        return NextResponse.json({ success: false, error: `Slug "${data.slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
      }
    }

    // Cross-field price check against current values when only one is sent
    const effectiveOriginal = data.originalPrice ?? Number(existing.originalPrice);
    const effectiveSale = data.salePrice ?? Number(existing.salePrice);
    if (effectiveSale > effectiveOriginal) {
      return NextResponse.json(
        { success: false, error: "Giá bán phải nhỏ hơn hoặc bằng giá gốc", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const description = data.description !== undefined ? sanitizeHtml(data.description) : undefined;
    const { saleDeadline, platformVariants, commitments, registrationProcedure, ...rest } = data;
    const updateData = {
      ...rest,
      ...(description !== undefined ? { description } : {}),
      ...(saleDeadline !== undefined ? { saleDeadline: saleDeadline ? new Date(saleDeadline) : null } : {}),
      ...(platformVariants !== undefined ? { platformVariants: platformVariants as never } : {}),
      ...(commitments !== undefined ? { commitments: commitments as never } : {}),
      ...(registrationProcedure !== undefined ? { registrationProcedure } : {}),
    };

    const updated = await prisma.course.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, name: true, isActive: true, updatedAt: true },
    });

    // Trang /khoa-hoc cache danh sách khóa học qua unstable_cache (revalidate: 300s) —
    // phải revalidate ngay để giá gốc/giá giảm mới không bị hiển thị sai (stale) tới 5 phút
    revalidatePath("/khoa-hoc");

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_UPDATE",
      targetType: "Course",
      targetId: id,
      before: { slug: existing.slug, name: existing.name },
      after: rest as Record<string, string | number | boolean>,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── DELETE — Soft delete ──────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "courses:delete");
    const { id } = await params;

    const existing = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Khoá học không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.course.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

    revalidatePath("/khoa-hoc");

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_DELETE",
      targetType: "Course",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa khoá học" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
