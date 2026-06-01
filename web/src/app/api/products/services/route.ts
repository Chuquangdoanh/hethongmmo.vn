import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
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
    const featured = searchParams.get("featured");
    const slug = searchParams.get("slug") ?? undefined;

    if (slug) {
      const item = await prisma.service.findUnique({
        where: { slug, deletedAt: null },
        select: {
          id: true, slug: true, name: true, thumbnail: true, platform: true,
          category: true, price: true, successRate: true, processingTime: true,
          rating: true, totalOrders: true, isActive: true, isFeatured: true,
          description: true, seoTitle: true, seoDescription: true,
          warrantyOptions: true, productList: true, displayOrder: true,
        },
      });
      if (!item || !item.isActive) {
        return NextResponse.json({ error: "Dịch vụ không tồn tại", code: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ data: item });
    }

    const where = {
      isActive: true, deletedAt: null,
      ...(platform ? { platform: platform as never } : {}),
      ...(category ? { category } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        select: {
          id: true, slug: true, name: true, thumbnail: true, platform: true,
          category: true, price: true, successRate: true, processingTime: true,
          rating: true, totalOrders: true, isFeatured: true, warrantyOptions: true,
          displayOrder: true,
        },
        orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { totalOrders: "desc" }],
        skip, take: limit,
      }),
      prisma.service.count({ where }),
    ]);
    return NextResponse.json({ data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — Create service (Staff+) ───────────────────────────────────────────

const serviceCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9 và dấu gạch ngang").min(3).max(200).optional(),
  platform: z.enum(["FACEBOOK", "TIKTOK", "GOOGLE", "INSTAGRAM", "YOUTUBE", "ICLOUD", "ZALO", "TELEGRAM", "TWITTER", "OTHER"]),
  category: z.string().min(1).max(100),
  price: z.number().positive().max(100_000_000),
  thumbnail: z.string().url().optional(),
  successRate: z.number().int().min(0).max(100).default(100),
  processingTime: z.string().max(100).optional(),
  description: z.string().max(10_000).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  customerCount: z.number().int().min(0).default(0),
  reviewCount: z.number().int().min(0).default(0),
  totalViews: z.number().int().min(0).default(0),
  totalOrders: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).default(0),
  platformVariants: z.array(z.object({ name: z.string().min(1).max(100), icon: z.string().max(500).default("") })).max(20).default([]),
  warrantyOptions: z.array(z.object({ name: z.string().max(200), price: z.number().min(0) })).max(10).default([]),
  productList: z.array(z.object({ name: z.string().max(200), price: z.number().min(0) })).max(50).default([]),
  displayOrder: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  requiresAccountType: z.boolean().default(false),
  requiresCccd: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = serviceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const slug = data.slug ?? toSlug(data.name);

    const existing = await prisma.service.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Slug "${slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
    }

    const description = data.description ? sanitizeHtml(data.description) : undefined;

    const service = await prisma.service.create({
      data: {
        slug,
        name: data.name,
        thumbnail: data.thumbnail,
        platform: data.platform,
        category: data.category,
        price: data.price,
        successRate: data.successRate,
        processingTime: data.processingTime,
        description,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        customerCount: data.customerCount,
        reviewCount: data.reviewCount,
        totalViews: data.totalViews,
        totalOrders: data.totalOrders,
        rating: data.rating,
        platformVariants: data.platformVariants as never,
        warrantyOptions: data.warrantyOptions,
        productList: data.productList,
        displayOrder: data.displayOrder,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        requiresAccountType: data.requiresAccountType,
        requiresCccd: data.requiresCccd,
      },
      select: { id: true, slug: true, name: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "SERVICE_CREATE",
      targetType: "Service",
      targetId: service.id,
      after: { id: service.id, slug: service.slug, name: service.name },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
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
