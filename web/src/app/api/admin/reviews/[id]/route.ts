import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const patchSchema = z.object({
  rating:  z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy đánh giá", code: "NOT_FOUND" }, { status: 404 });

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(parsed.data.rating  !== undefined ? { rating:  parsed.data.rating  } : {}),
        ...(parsed.data.comment !== undefined ? { comment: parsed.data.comment } : {}),
      },
    });

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_REVIEW",
      targetType: "Review",
      targetId:   id,
      before:     { rating: existing.rating, comment: existing.comment },
      after:      { rating: updated.rating,  comment: updated.comment  },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);

    const { id } = await params;
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy đánh giá", code: "NOT_FOUND" }, { status: 404 });

    await prisma.review.delete({ where: { id } });

    await writeAuditLog({
      actorId:    me.id,
      action:     "DELETE_REVIEW",
      targetType: "Review",
      targetId:   id,
      before:     { rating: existing.rating, comment: existing.comment },
    });

    return apiSuccess("Đã xóa đánh giá");
  } catch (err) {
    return apiCatch(err);
  }
}
