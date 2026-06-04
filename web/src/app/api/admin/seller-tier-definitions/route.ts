import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const tierSchema = z.object({
  key:                z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/, "Chỉ dùng chữ HOA, số và _"),
  label:              z.string().min(1).max(30),
  description:        z.string().max(200).optional(),
  badgeColor:         z.string().max(30).default("gray"),
  feePercent:         z.number().min(0).max(50),
  minWithdrawal:      z.number().int().min(0),
  holdDays:           z.number().int().min(0).max(30),
  benefits:           z.array(z.string().max(100)).max(10).default([]),
  upgradeMinRevenue:  z.number().int().min(0).default(0),
  upgradeMinOrders:   z.number().int().min(0).default(0),
  displayOrder:       z.number().int().min(0).default(0),
  isActive:           z.boolean().default(true),
});

// GET — list all tier definitions (admin)
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const tiers = await prisma.sellerTierDefinition.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return apiList(tiers, { total: tiers.length, page: 1, limit: 100, totalPages: 1 });
  } catch (err) {
    return apiCatch(err);
  }
}

// POST — create new tier
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = tierSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.sellerTierDefinition.findUnique({
      where: { key: parsed.data.key },
    });
    if (existing) {
      return NextResponse.json({ error: "Key hạng đã tồn tại", code: "DUPLICATE" }, { status: 409 });
    }

    const tier = await prisma.sellerTierDefinition.create({ data: parsed.data });

    await writeAuditLog({
      actorId:    me.id,
      action:     "CREATE_SELLER_TIER",
      targetType: "SellerTierDefinition",
      targetId:   tier.id,
      after:      parsed.data,
    });

    return apiOk(tier, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
