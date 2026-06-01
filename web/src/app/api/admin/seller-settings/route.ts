import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const slotPackageSchema = z.object({
  slots: z.number().int().min(1).max(100),
  price: z.number().int().min(0),
});

const tierConfigSchema = z.object({
  fee_percent:     z.number().min(0).max(50),
  min_withdrawal:  z.number().int().min(0),
  hold_days:       z.number().int().min(0).max(30),
});

const settingsSchema = z.object({
  withdrawal_fee_percent:  z.number().min(0).max(50),
  min_withdrawal_amount:   z.number().min(0).int(),
  order_hold_days:         z.number().min(0).max(30).int(),
  slot_packages:           z.array(slotPackageSchema).min(1).max(10),
  tier_config: z.object({
    STANDARD: tierConfigSchema,
    SILVER:   tierConfigSchema,
    GOLD:     tierConfigSchema,
    VIP:      tierConfigSchema,
  }).optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const config = await prisma.systemConfig.findUnique({
      where: { key: "seller_settings" },
      select: { value: true },
    });

    const defaults = { withdrawal_fee_percent: 5, min_withdrawal_amount: 200_000, order_hold_days: 3 };
    return apiOk({ ...defaults, ...(config?.value as object ?? {}) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.systemConfig.findUnique({
      where: { key: "seller_settings" },
      select: { value: true },
    });

    await prisma.systemConfig.upsert({
      where: { key: "seller_settings" },
      create: {
        key: "seller_settings",
        value: parsed.data,
        description: "Cấu hình rút tiền nhà bán hàng",
        updatedByUserId: admin.id,
      },
      update: {
        value: parsed.data,
        updatedByUserId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "UPDATE_SELLER_SETTINGS",
        targetType: "SystemConfig",
        targetId: "seller_settings",
        before: (existing?.value ?? undefined) as Prisma.InputJsonObject | undefined,
        after: parsed.data as Prisma.InputJsonObject,
      },
    });

    return apiSuccess("Cập nhật cấu hình thành công");
  } catch (err) {
    return apiCatch(err);
  }
}
