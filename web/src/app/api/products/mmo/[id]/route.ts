import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const mmoPatchSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(200).optional(),
  thumbnail: z.string().url().optional(),
  category: z.string().min(1).max(100).optional(),
  categoryGroup: z.string().min(1).max(100).optional(),
  price: z.number().positive().max(100_000_000).optional(),
  description: z.string().max(10_000).optional(),
  warrantyInfo: z.string().max(2000).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresAccountType: z.boolean().optional(),
  requiresCccd: z.boolean().optional(),
  section: z.enum(["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN", "TOOL_PHAN_MEM"]).optional(),
  postedByUserId: z.string().uuid().optional(),
});

// ── PATCH — Update MMO product (Staff+) ──────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = mmoPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const data = parsed.data;

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.mmoProduct.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (slugConflict) {
        return NextResponse.json({ success: false, error: `Slug "${data.slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
      }
    }

    const { description, ...rest } = data;
    const updateData = {
      ...rest,
      ...(description !== undefined ? { description: sanitizeHtml(description) } : {}),
    };

    const updated = await prisma.mmoProduct.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, name: true, isActive: true, updatedAt: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_PRODUCT_UPDATE",
      targetType: "MmoProduct",
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

// ── DELETE — Soft delete (Admin only) ────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:delete");
    const { id } = await params;

    const existing = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.mmoProduct.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

    await writeAuditLog({
      actorId: actor.id,
      action: "MMO_PRODUCT_DELETE",
      targetType: "MmoProduct",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa sản phẩm MMO" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
