import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

// GET /api/products/testimonials?type=COURSE&courseId=xxx
// GET /api/products/testimonials?type=SERVICE
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const type     = searchParams.get("type") as "COURSE" | "SERVICE" | null;
    const courseId = searchParams.get("courseId") ?? undefined;

    if (!type) {
      return NextResponse.json({ success: false, error: "Thiếu tham số type", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const items = await prisma.testimonial.findMany({
      where: {
        type,
        isActive: true,
        ...(type === "COURSE" && courseId ? { courseId } : {}),
      },
      select: {
        id: true,
        category: true,
        reviewerName: true,
        reviewerRole: true,
        reviewerAvatar: true,
        reviewerInitials: true,
        reviewerColor: true,
        content: true,
        rating: true,
        createdAt: true,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
