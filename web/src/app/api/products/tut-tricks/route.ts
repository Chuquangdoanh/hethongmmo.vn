import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { sanitizeHtml } from "@/lib/security/sanitize";
import { writeAuditLog } from "@/lib/security/audit";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

// ── GET — Public list + detail ────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const platform = searchParams.get("platform") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const slug = searchParams.get("slug") ?? undefined;

    if (slug) {
      const item = await prisma.tutTrick.findUnique({
        where: { slug, deletedAt: null },
        select: {
          id: true, slug: true, name: true, thumbnail: true, platform: true,
          category: true, price: true, description: true, docs: true,
          seoTitle: true, seoDescription: true, isActive: true, isFeatured: true,
          successRate: true, rating: true, totalOrders: true, displayOrder: true,
          publishedDate: true,
          // contentUrlEnc NEVER returned — delivered only after purchase
        },
      });
      if (!item || !item.isActive) {
        return NextResponse.json({ error: "Tut/Trick không tồn tại", code: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ data: item });
    }

    const where = {
      isActive: true, deletedAt: null,
      ...(platform ? { platform: platform as never } : {}),
      ...(category ? { category } : {}),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.tutTrick.findMany({
        where,
        select: {
          id: true, slug: true, name: true, thumbnail: true, platform: true,
          category: true, price: true, successRate: true, rating: true,
          totalOrders: true, isFeatured: true, displayOrder: true,
        },
        orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { totalOrders: "desc" }],
        skip, take: limit,
      }),
      prisma.tutTrick.count({ where }),
    ]);
    return NextResponse.json({ data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — Create tut/trick (Staff+) ─────────────────────────────────────────

const tutTrickCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9 và dấu gạch ngang").min(3).max(200).optional(),
  thumbnail: z.string().url().optional(),
  platform: z.enum(["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"]),
  category: z.string().min(1).max(100),
  price: z.number().min(0).max(100_000_000),
  description: z.string().max(10_000).optional(),
  contentUrl: z.string().url("contentUrl phải là URL hợp lệ").optional(),
  docs: z.string().max(50_000).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  warrantyPolicy: z.string().max(500).optional(),
  processingTime: z.string().max(200).optional(),
  successRate: z.number().int().min(0).max(100).default(100),
  rating: z.number().min(0).max(5).default(0),
  totalOrders: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  publishedDate: z.string().datetime().optional(),
  requiresAccountType: z.boolean().default(false),
  requiresCccd: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = tutTrickCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const slug = data.slug ?? toSlug(data.name);

    const existing = await prisma.tutTrick.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Slug "${slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
    }

    // Encrypt contentUrl → contentUrlEnc; never store plaintext
    const contentUrlEnc = data.contentUrl
      ? (Buffer.from(encrypt(data.contentUrl)) as unknown as Uint8Array<ArrayBuffer>)
      : undefined;

    const description = data.description ? sanitizeHtml(data.description) : undefined;
    const docs = data.docs ? sanitizeHtml(data.docs) : undefined;

    const tutTrick = await prisma.tutTrick.create({
      data: {
        slug,
        name: data.name,
        thumbnail: data.thumbnail,
        platform: data.platform,
        category: data.category,
        price: data.price,
        description,
        contentUrlEnc,
        docs,
        warrantyPolicy: data.warrantyPolicy,
        processingTime: data.processingTime,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        successRate: data.successRate,
        rating: data.rating,
        totalOrders: data.totalOrders,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
        publishedDate: data.publishedDate ? new Date(data.publishedDate) : undefined,
        requiresAccountType: data.requiresAccountType,
        requiresCccd: data.requiresCccd,
      },
      select: { id: true, slug: true, name: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TUT_TRICK_CREATE",
      targetType: "TutTrick",
      targetId: tutTrick.id,
      after: { id: tutTrick.id, slug: tutTrick.slug, name: tutTrick.name, hasContentUrl: !!contentUrlEnc },
    });

    return NextResponse.json({ success: true, data: tutTrick }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}
