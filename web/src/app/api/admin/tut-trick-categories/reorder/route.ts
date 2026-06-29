import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError, apiCatch } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { z } from "zod";

export const runtime = "nodejs";

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.number().int().min(0) })).min(1).max(200),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);

    const body: unknown = await req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return apiError("Dữ liệu không hợp lệ", "VALIDATION_ERROR", 400);

    const { items } = parsed.data;

    await prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        prisma.tutTrickCategory.update({ where: { id }, data: { displayOrder } })
      )
    );

    await writeAuditLog({
      actorId: me.id,
      action: "REORDER_TUT_TRICK_CATEGORIES",
      targetType: "TutTrickCategory",
      targetId: "batch",
      after: { count: items.length },
    });

    return apiSuccess("Đã cập nhật thứ tự");
  } catch (err) {
    return apiCatch(err);
  }
}
