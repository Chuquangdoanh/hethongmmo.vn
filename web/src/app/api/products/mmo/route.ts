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

// ── GET — Public list + detail ────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const category = searchParams.get("category") ?? undefined;
    const categoryGroup = searchParams.get("group") ?? undefined;
    const slug = searchParams.get("slug") ?? undefined;

    if (slug) {
      const item = await prisma.mmoProduct.findUnique({
        where: { slug, deletedAt: null },
        select: {
          id: true, slug: true, name: true, thumbnail: true, category: true,
          categoryGroup: true, price: true, description: true, isActive: true,
          isFeatured: true, displayOrder: true,
          _count: { select: { items: { where: { status: "AVAILABLE" } } } },
        },
      });
      if (!item || !item.isActive) {
        return NextResponse.json({ error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" }, { status: 404 });
      }
      const { _count, ...rest } = item;
      return NextResponse.json({ data: { ...rest, stockCount: _count.items } });
    }

    const where = {
      isActive: true, deletedAt: null,
      ...(category ? { category } : {}),
      ...(categoryGroup ? { categoryGroup } : {}),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.mmoProduct.findMany({
        where,
        select: {
          id: true, slug: true, name: true, thumbnail: true, category: true,
          categoryGroup: true, price: true, isFeatured: true, displayOrder: true,
          _count: { select: { items: { where: { status: "AVAILABLE" } } } },
        },
        orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
        skip, take: limit,
      }),
      prisma.mmoProduct.count({ where }),
    ]);
    const data = items.map(({ _count, ...rest }) => ({ ...rest, stockCount: _count.items }));
    return NextResponse.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — Create MMO product (Staff+) ───────────────────────────────────────

const mmoCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9 và dấu gạch ngang").min(3).max(200).optional(),
  thumbnail: z.string().url().optional(),
  category: z.string().min(1).max(100),
  categoryGroup: z.string().min(1).max(100),
  price: z.number().positive().max(100_000_000),
  description: z.string().max(10_000).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  requiresAccountType: z.boolean().default(false),
  requiresCccd: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:create");

    const body: unknown = await req.json();
    const parsed = mmoCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const slug = data.slug ?? toSlug(data.name);

    const existing = await prisma.mmoProduct.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Slug "${slug}" đã tồn tại`, code: "DUPLICATE_ENTRY" }, { status: 409 });
    }

    const description = data.description ? sanitizeHtml(data.description) : undefined;

    const product = await prisma.mmoProduct.create({
      data: {
        slug,
        name: data.name,
        thumbnail: data.thumbnail,
        category: data.category,
        categoryGroup: data.categoryGroup,
        price: data.price,
        description,
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
      action: "MMO_PRODUCT_CREATE",
      targetType: "MmoProduct",
      targetId: product.id,
      after: { id: product.id, slug: product.slug, name: product.name },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
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
