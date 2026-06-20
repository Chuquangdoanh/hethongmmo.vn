import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const tutTrickPatchSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(200).optional(),
  thumbnail: z.string().url().optional(),
  platform: z.enum(["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"]).optional(),
  category: z.string().min(1).max(100).optional(),
  tier: z.string().max(50).optional(),
  price: z.number().min(0).max(100_000_000).optional(),
  description: z.string().max(10_000).optional(),
  contentUrl: z.string().max(2000).optional(),
  docs: z.string().max(50_000).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  warrantyPolicy: z.string().max(500).optional(),
  processingTime: z.string().max(200).optional(),
  successRate: z.number().int().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  totalOrders: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  publishedDate: z.string().datetime().nullable().optional(),
  requiresAccountType: z.boolean().optional(),
  requiresCccd: z.boolean().optional(),
});

// ── PATCH — Update tut/trick (Staff+) ────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "tut_tricks:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = tutTrickPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const existing = await prisma.tutTrick.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tut/Trick không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    const data = parsed.data;

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.tutTrick.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (slugConflict) {
        return NextResponse.json({ success: false, error: `Slug "${data.slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
      }
    }

    const { contentUrl, description, docs, publishedDate, ...rest } = data;

    const updateData: Parameters<typeof prisma.tutTrick.update>[0]["data"] = { ...rest };

    if (contentUrl !== undefined) {
      updateData.contentUrlEnc = contentUrl === ""
        ? null
        : Buffer.from(encrypt(contentUrl)) as unknown as Uint8Array<ArrayBuffer>;
    }
    if (description !== undefined) updateData.description = sanitizeHtml(description);
    if (docs !== undefined) updateData.docs = sanitizeHtml(docs);
    if (publishedDate !== undefined) {
      updateData.publishedDate = publishedDate ? new Date(publishedDate) : null;
    }

    const updated = await prisma.tutTrick.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, name: true, isActive: true, updatedAt: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TUT_TRICK_UPDATE",
      targetType: "TutTrick",
      targetId: id,
      before: { slug: existing.slug, name: existing.name },
      after: {
        ...rest,
        ...(contentUrl !== undefined ? { contentUrlUpdated: true } : {}),
      } as Record<string, string | number | boolean>,
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
    await requirePermission(session, "tut_tricks:delete");
    const { id } = await params;

    const existing = await prisma.tutTrick.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Tut/Trick không tồn tại", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.tutTrick.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

    await writeAuditLog({
      actorId: actor.id,
      action: "TUT_TRICK_DELETE",
      targetType: "TutTrick",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ success: true, message: "Đã xóa tut/trick" });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
