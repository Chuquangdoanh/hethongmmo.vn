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

const servicePatchSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(200).optional(),
  platform: z.enum(["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"]).optional(),
  category: z.string().min(1).max(100).optional(),
  price: z.number().positive().max(100_000_000).optional(),
  thumbnail: z.string().url().optional(),
  successRate: z.number().int().min(0).max(100).optional(),
  processingTime: z.string().max(100).optional(),
  description: z.string().max(10_000).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  customerCount: z.number().int().min(0).optional(),
  reviewCount: z.number().int().min(0).optional(),
  totalViews: z.number().int().min(0).optional(),
  totalOrders: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  platformVariants: z.array(z.object({ name: z.string().min(1).max(100), icon: z.string().max(500).default("") })).max(20).optional(),
  warrantyOptions: z.array(z.object({ name: z.string().max(200), price: z.number().min(0) })).max(10).optional(),
  productList: z.array(z.object({ name: z.string().max(200), price: z.number().min(0) })).max(50).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresAccountType: z.boolean().optional(),
  requiresCccd: z.boolean().optional(),
});

// ── PATCH — Update service (Staff+) ──────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "services:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = servicePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.service.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, slug: true, name: true, platform: true, category: true, price: true, isActive: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Dịch vụ không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const data = parsed.data;

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.service.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (slugConflict) {
        return NextResponse.json({ success: false, error: `Slug "${data.slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
      }
    }

    const description = data.description !== undefined ? sanitizeHtml(data.description) : undefined;
    const { platformVariants, ...rest } = data;
    const updateData = {
      ...rest,
      ...(description !== undefined ? { description } : {}),
      ...(platformVariants !== undefined ? { platformVariants: platformVariants as never } : {}),
    };

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, name: true, isActive: true, updatedAt: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "SERVICE_UPDATE",
      targetType: "Service",
      targetId: id,
      before: { slug: existing.slug, name: existing.name, price: existing.price.toString() },
      after: data as Record<string, string | number | boolean>,
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
    await requirePermission(session, "services:delete");
    const { id } = await params;

    const existing = await prisma.service.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Dịch vụ không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "SERVICE_DELETE",
      targetType: "Service",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa dịch vụ" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
