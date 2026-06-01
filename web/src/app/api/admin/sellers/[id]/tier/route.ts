import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

const schema = z.object({
  tier: z.enum(["STANDARD", "SILVER", "GOLD", "VIP"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, sellerStatus: true, sellerTier: true },
    });
    if (!user) throw new NotFoundError("User");

    await prisma.user.update({
      where: { id },
      data: { sellerTier: parsed.data.tier },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "UPDATE_SELLER_TIER",
        targetType: "User",
        targetId: id,
        before: { sellerTier: user.sellerTier },
        after: { sellerTier: parsed.data.tier },
      },
    });

    return apiSuccess(`Đã cập nhật hạng seller thành ${parsed.data.tier}`);
  } catch (err) {
    return apiCatch(err);
  }
}
