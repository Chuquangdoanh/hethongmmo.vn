import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import { affiliateWithdrawalSettingsSchema } from "@/lib/validation/affiliate-withdrawal-settings.schema";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const CONFIG_KEY = "affiliate_withdrawal_settings";
const DEFAULTS = { hold_days: 3, min_withdrawal_amount: 0, withdrawal_fee_percent: 0 };

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { value: true },
    });

    return apiOk({ ...DEFAULTS, ...(config?.value as object ?? {}) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = affiliateWithdrawalSettingsSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { value: true },
    });

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: parsed.data,
        description: "Cấu hình rút hoa hồng affiliate",
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
        action: "UPDATE_AFFILIATE_SETTINGS",
        targetType: "SystemConfig",
        targetId: CONFIG_KEY,
        before: (existing?.value ?? undefined) as Prisma.InputJsonObject | undefined,
        after: parsed.data as Prisma.InputJsonObject,
      },
    });

    return apiSuccess("Cập nhật cấu hình thành công");
  } catch (err) {
    return apiCatch(err);
  }
}
