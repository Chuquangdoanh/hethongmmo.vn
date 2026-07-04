import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const CONFIG_KEY = "deposit_bank_config";

const depositBankSchema = z.object({
  bank_name:      z.string().min(1, "Tên ngân hàng không được để trống").max(50).trim(),
  account_number: z.string().min(6, "Số tài khoản phải từ 6 ký tự").max(30).trim(),
  account_holder: z.string().min(1, "Tên chủ tài khoản không được để trống").max(100).trim(),
  bank_bin:       z.string().min(1, "Bank BIN không được để trống").max(20).trim(),
  ip_whitelist:   z.array(z.string().trim().min(7).max(45)).max(20).default([]),
  tax_percent:    z.number().min(0, "Thuế không được âm").max(100, "Thuế tối đa 100%").default(0),
});

export type DepositBankConfig = z.infer<typeof depositBankSchema>;

const DEFAULTS: DepositBankConfig = {
  bank_name:      process.env.BANK_NAME           ?? "MB Bank",
  account_number: process.env.BANK_ACCOUNT_NUMBER ?? "0393118789",
  account_holder: process.env.BANK_ACCOUNT_HOLDER ?? "CHU QUANG DOANH",
  bank_bin:       process.env.BANK_BIN            ?? "MB",
  ip_whitelist:   (process.env.SEPAY_IP_WHITELIST ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  tax_percent:    8, // giá trị gợi ý pre-fill; thuế chỉ áp sau khi admin lưu config
};

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
    const parsed = depositBankSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { value: true },
    });

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: parsed.data as Prisma.InputJsonObject,
        description: "Cấu hình tài khoản ngân hàng nhận nạp tiền",
        updatedByUserId: admin.id,
      },
      update: {
        value: parsed.data as Prisma.InputJsonObject,
        updatedByUserId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "UPDATE_DEPOSIT_BANK_CONFIG",
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
