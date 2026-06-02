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
    const category = searchParams.get("category") ?? undefined;
    const badge = searchParams.get("badge") ?? undefined;
    const slug = searchParams.get("slug") ?? undefined;

    if (slug) {
      const item = await prisma.course.findUnique({
        where: { slug, deletedAt: null },
        select: {
          id: true, slug: true, name: true, thumbnail: true, description: true,
          category: true, learningFormat: true, originalPrice: true, salePrice: true,
          duration: true, studentCount: true, instructorName: true, rating: true,
          contentList: true, platformVariants: true, badge: true, saleDeadline: true,
          youtubeUrl: true, seoTitle: true, seoDescription: true, totalOrders: true,
          isActive: true, displayOrder: true,
          commitments: true, registrationProcedure: true,
        },
      });
      if (!item || !item.isActive) {
        return NextResponse.json({ error: "Khoá học không tồn tại", code: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ data: item });
    }

    const where = {
      isActive: true, deletedAt: null,
      ...(category ? { category } : {}),
      ...(badge ? { badge: badge as never } : {}),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          id: true, slug: true, name: true, thumbnail: true, category: true,
          learningFormat: true, originalPrice: true, salePrice: true, duration: true,
          studentCount: true, rating: true, badge: true, saleDeadline: true,
          displayOrder: true, totalOrders: true,
        },
        orderBy: [{ displayOrder: "asc" }, { totalOrders: "desc" }],
        skip, take: limit,
      }),
      prisma.course.count({ where }),
    ]);
    return NextResponse.json({ data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — Create course (Staff+) ─────────────────────────────────────────────

const courseCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9 và dấu gạch ngang").min(3).max(200).optional(),
  thumbnail: z.string().url().optional(),
  description: z.string().max(10_000).optional(),
  category: z.string().min(1).max(100),
  learningFormat: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
  originalPrice: z.number().positive().max(100_000_000),
  salePrice: z.number().min(0).max(100_000_000),
  duration: z.string().max(100).optional(),
  studentCount: z.number().int().min(0).default(0),
  instructorName: z.string().max(200).optional(),
  contentList: z.array(z.string().max(20000)).max(100).default([]),
  platformVariants: z.array(z.object({
    name: z.string().min(1).max(100),
    icon: z.string().max(50).default(""),
  })).max(20).default([]),
  totalViews: z.number().int().min(0).default(0),
  totalOrders: z.number().int().min(0).default(0),
  badge: z.enum(["NONE", "HOT", "POPULAR", "TREND", "NEW", "VIP"]).default("NONE"),
  saleDeadline: z.string().datetime().optional(),
  youtubeUrl: z.string().url().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  requiresAccountType: z.boolean().default(false),
  requiresCccd: z.boolean().default(false),
  commitments: z.array(z.string().max(500)).max(20).default([]),
  registrationProcedure: z.string().max(5000).optional(),
}).refine((d) => d.salePrice <= d.originalPrice, {
  message: "Giá bán phải nhỏ hơn hoặc bằng giá gốc",
  path: ["salePrice"],
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = courseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const slug = data.slug ?? toSlug(data.name);

    const existing = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Slug "${slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
    }

    const description = data.description ? sanitizeHtml(data.description) : undefined;

    const course = await prisma.course.create({
      data: {
        slug,
        name: data.name,
        thumbnail: data.thumbnail,
        description,
        category: data.category,
        learningFormat: data.learningFormat,
        originalPrice: data.originalPrice,
        salePrice: data.salePrice,
        duration: data.duration,
        studentCount: data.studentCount,
        instructorName: data.instructorName,
        contentList: data.contentList,
        platformVariants: data.platformVariants as never,
        totalViews: data.totalViews,
        totalOrders: data.totalOrders,
        badge: data.badge,
        saleDeadline: data.saleDeadline ? new Date(data.saleDeadline) : undefined,
        youtubeUrl: data.youtubeUrl,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        requiresAccountType: data.requiresAccountType,
        requiresCccd: data.requiresCccd,
        commitments: data.commitments as never,
        registrationProcedure: data.registrationProcedure,
      },
      select: { id: true, slug: true, name: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "COURSE_CREATE",
      targetType: "Course",
      targetId: course.id,
      after: { id: course.id, slug: course.slug, name: course.name },
    });

    return NextResponse.json({ success: true, data: course }, { status: 201 });
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
