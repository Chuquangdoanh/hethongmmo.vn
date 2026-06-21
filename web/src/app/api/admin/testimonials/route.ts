import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const AVATAR_COLORS = ["#0066ff","#10b981","#7c3aed","#f59e0b","#ef4444","#ec4899"];

const createSchema = z.object({
  type:             z.enum(["COURSE", "SERVICE"]),
  courseId:         z.string().uuid().optional(),
  serviceId:        z.string().uuid().optional(),
  category:         z.string().max(100).optional(),
  reviewerName:     z.string().min(1).max(100),
  reviewerRole:     z.string().max(100).optional(),
  reviewerAvatar:   z.string().url().optional(),
  reviewerInitials: z.string().max(5).optional(),
  reviewerColor:    z.string().max(20).optional(),
  content:          z.string().min(1).max(2000),
  rating:           z.number().int().min(1).max(5).default(5),
  isActive:         z.boolean().default(true),
  displayOrder:     z.number().int().min(0).default(0),
});

// ── GET — list ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:read");

    const { searchParams } = req.nextUrl;
    const type     = searchParams.get("type") as "COURSE" | "SERVICE" | null;
    const courseId = searchParams.get("courseId") ?? undefined;
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

    const where = {
      ...(type ? { type } : {}),
      ...(courseId ? { courseId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        include: {
          course:  { select: { id: true, name: true, slug: true } },
          service: { select: { id: true, name: true, slug: true, category: true } },
        },
        orderBy: [{ type: "asc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.testimonial.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: items, meta: { total, page, limit } });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}

// ── POST — create ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:create");

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const d = parsed.data;

    // Auto-generate initials + color nếu chưa có
    const initials = d.reviewerInitials ?? d.reviewerName.split(" ").map(w => w[0]?.toUpperCase() ?? "").slice(0, 3).join("");
    const color    = d.reviewerColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? "#0066ff";

    const item = await prisma.testimonial.create({
      data: {
        type:             d.type,
        courseId:         d.type === "COURSE"  ? (d.courseId  ?? null) : null,
        serviceId:        d.type === "SERVICE" ? (d.serviceId ?? null) : null,
        category:         d.category,
        reviewerName:     d.reviewerName,
        reviewerRole:     d.reviewerRole,
        reviewerAvatar:   d.reviewerAvatar,
        reviewerInitials: initials,
        reviewerColor:    color,
        content:          d.content,
        rating:           d.rating,
        isActive:         d.isActive,
        displayOrder:     d.displayOrder,
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
