import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  label:              z.string().min(1).max(30).optional(),
  description:        z.string().max(200).optional(),
  badgeColor:         z.string().max(30).optional(),
  feePercent:         z.number().min(0).max(50).optional(),
  minWithdrawal:      z.number().int().min(0).optional(),
  holdDays:           z.number().int().min(0).max(30).optional(),
  benefits:           z.array(z.string().max(100)).max(10).optional(),
  upgradeMinRevenue:  z.number().int().min(0).optional(),
  upgradeMinOrders:   z.number().int().min(0).optional(),
  displayOrder:       z.number().int().min(0).optional(),
  isActive:           z.boolean().optional(),
});

// PATCH — update tier (built-in or custom)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    const existing = await prisma.sellerTierDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Hạng seller");

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const updated = await prisma.sellerTierDefinition.update({
      where: { id },
      data:  parsed.data,
    });

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_SELLER_TIER",
      targetType: "SellerTierDefinition",
      targetId:   id,
      before:     existing,
      after:      parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

// DELETE — only non-built-in tiers
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);
    const { id } = await params;

    const tier = await prisma.sellerTierDefinition.findUnique({ where: { id } });
    if (!tier) throw new NotFoundError("Hạng seller");
    if (tier.isBuiltIn) throw new ValidationError("Không thể xóa hạng mặc định hệ thống");

    // Move any sellers on this tier to STANDARD
    await prisma.user.updateMany({
      where: { sellerTier: tier.key },
      data:  { sellerTier: "STANDARD" },
    });

    await prisma.sellerTierDefinition.delete({ where: { id } });

    await writeAuditLog({
      actorId:    me.id,
      action:     "DELETE_SELLER_TIER",
      targetType: "SellerTierDefinition",
      targetId:   id,
      before:     tier,
    });

    return apiSuccess(`Đã xóa hạng ${tier.label}`);
  } catch (err) {
    return apiCatch(err);
  }
}
