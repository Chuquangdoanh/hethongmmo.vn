import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const CONFIG_KEY = "chat_moderation_config";

const chatModerationSchema = z.object({
  bannedKeywords: z.array(z.string().trim().min(1).max(50)).max(200).default([]),
});

export type ChatModerationConfig = z.infer<typeof chatModerationSchema>;

const DEFAULTS: ChatModerationConfig = { bannedKeywords: [] };

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
    const parsed = chatModerationSchema.safeParse(body);
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
        description: "Danh sách từ khóa cấm trong chat giữa User và Seller",
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
        action: "UPDATE_CHAT_MODERATION_CONFIG",
        targetType: "SystemConfig",
        targetId: CONFIG_KEY,
        before: (existing?.value ?? undefined) as Prisma.InputJsonObject | undefined,
        after: parsed.data as Prisma.InputJsonObject,
      },
    });

    return apiSuccess("Cập nhật danh sách từ cấm thành công");
  } catch (err) {
    return apiCatch(err);
  }
}
