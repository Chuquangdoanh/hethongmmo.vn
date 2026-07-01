import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const schema = z.object({
  tier: z.string().min(1).max(50),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
 await requirePermission(session, "sellers:update");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    // Verify the tier key exists in seller_tier_definitions
    const tierDef = await prisma.sellerTierDefinition.findUnique({
      where: { key: parsed.data.tier },
    });
    if (!tierDef) throw new ValidationError("Hạng seller không tồn tại");

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, sellerStatus: true, sellerTier: true },
    });
    if (!user) throw new NotFoundError("User");

    await prisma.user.update({
      where: { id },
      data: { sellerTier: parsed.data.tier },
    });

    await prisma.notification.create({
      data: {
        userId: id,
        title: "Hạng gian hàng được cập nhật",
        body: `Hạng gian hàng của bạn đã được nâng lên ${tierDef.label}.`,
        type: "SELLER_APPROVED",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "UPDATE_SELLER_TIER",
        targetType: "User",
        targetId: id,
        before: { sellerTier: user.sellerTier },
        after:  { sellerTier: parsed.data.tier },
      },
    });

    return apiSuccess(`Đã cập nhật hạng seller thành ${tierDef.label}`);
  } catch (err) {
    return apiCatch(err);
  }
}
