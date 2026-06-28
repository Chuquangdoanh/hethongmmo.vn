import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { z } from "zod";
import { invalidateKhuongfbConfigCache } from "@/lib/khuongfb/client";

export const runtime = "nodejs";

const CONFIG_KEY = "khuongfb_api_config";

const configSchema = z.object({
  baseUrl: z.string().url("URL không hợp lệ").trim(),
  apiKey:  z.string().min(8, "API key quá ngắn").trim(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const record = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    const val = record?.value as { baseUrl?: string; apiKey?: string } | null;

    return apiOk({
      baseUrl: val?.baseUrl ?? process.env.KHUONGFB_BASE_URL ?? "https://tainguyentesla.com/api",
      // Mask API key — chỉ trả về 8 ký tự đầu
      apiKeyMasked: val?.apiKey
        ? val.apiKey.slice(0, 8) + "••••••••"
        : process.env.KHUONGFB_API_KEY
          ? (process.env.KHUONGFB_API_KEY.slice(0, 8) + "••••••••")
          : "",
      source: record ? "db" : "env",
    });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { baseUrl, apiKey } = parsed.data;

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key:             CONFIG_KEY,
        value:           { baseUrl, apiKey },
        description:     "Cấu hình API Khuongfb — base URL và API key",
        updatedByUserId: me.id,
      },
      update: {
        value:           { baseUrl, apiKey },
        updatedByUserId: me.id,
      },
    });

    // Xóa cache để request tiếp theo dùng config mới
    invalidateKhuongfbConfigCache();

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_KHUONGFB_CONFIG",
      targetType: "SystemConfig",
      targetId:   CONFIG_KEY,
      after:      { baseUrl, apiKey: apiKey.slice(0, 8) + "••••" },
    });

    return apiOk({ saved: true });
  } catch (err) {
    return apiCatch(err);
  }
}
