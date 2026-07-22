import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  isActive: z.boolean(),
});

// POST — Ẩn / hiện nhanh nhiều sản phẩm MMO cùng lúc (Staff+)
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:update");

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { ids, isActive } = parsed.data;

    const result = await prisma.mmoProduct.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive },
    });

    if (result.count > 0) {
      await writeAuditLog({
        actorId: actor.id,
        action: "MMO_PRODUCT_UPDATE",
        targetType: "MmoProduct",
        targetId: ids[0] ?? "bulk",
        after: { bulkVisibility: isActive, count: result.count },
      });
    }

    return apiOk({ updated: result.count });
  } catch (err) {
    return apiCatch(err);
  }
}
