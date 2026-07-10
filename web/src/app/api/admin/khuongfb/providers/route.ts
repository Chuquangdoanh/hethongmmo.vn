import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { z } from "zod";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { getProviderConfigs, saveProviderConfigs, maskApiKey, type ProviderEntry } from "@/lib/external-providers/providers-config";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

// GET — danh sách providers (apiKey bị mask)
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const configs = await getProviderConfigs();
    return apiOk(configs.map(c => ({ ...c, apiKey: maskApiKey(c.apiKey) })));
  } catch (err) {
    return apiCatch(err);
  }
}

const addSchema = z.object({
  name:    z.string().min(1).max(100).trim(),
  baseUrl: z.string().url("URL không hợp lệ").trim(),
  apiKey:  z.string().min(8, "API key quá ngắn").trim(),
});

// POST — thêm provider mới
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const configs = await getProviderConfigs();
    const newId = randomBytes(4).toString("hex");
    const newEntry: ProviderEntry = {
      id:      newId,
      name:    parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      apiKey:  parsed.data.apiKey,
      enabled: true,
    };
    await saveProviderConfigs([...configs, newEntry], me.id);

    await writeAuditLog({
      actorId:    me.id,
      action:     "ADD_EXTERNAL_PROVIDER",
      targetType: "SystemConfig",
      targetId:   newId,
      after:      { name: parsed.data.name, baseUrl: parsed.data.baseUrl },
    });

    return apiOk({ ...newEntry, apiKey: maskApiKey(newEntry.apiKey) });
  } catch (err) {
    return apiCatch(err);
  }
}

const patchSchema = z.object({
  id:      z.string(),
  name:    z.string().min(1).max(100).trim().optional(),
  baseUrl: z.string().url("URL không hợp lệ").trim().optional(),
  apiKey:  z.string().min(8, "API key quá ngắn").trim().optional(),
  enabled: z.boolean().optional(),
});

// PATCH — cập nhật provider (bật/tắt, đổi key)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const configs = await getProviderConfigs();
    const idx = configs.findIndex(c => c.id === parsed.data.id);
    if (idx === -1) throw new NotFoundError("Provider");

    const updated: ProviderEntry = { ...configs[idx]!, ...parsed.data };
    configs[idx] = updated;
    await saveProviderConfigs(configs, me.id);

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_EXTERNAL_PROVIDER",
      targetType: "SystemConfig",
      targetId:   parsed.data.id,
      after:      { name: updated.name, enabled: updated.enabled },
    });

    return apiOk({ ...updated, apiKey: maskApiKey(updated.apiKey) });
  } catch (err) {
    return apiCatch(err);
  }
}

// DELETE — xóa provider (query param ?id=)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new NotFoundError("Provider id");

    const configs = await getProviderConfigs();
    const filtered = configs.filter(c => c.id !== id);
    if (filtered.length === configs.length) throw new NotFoundError("Provider");

    await saveProviderConfigs(filtered, me.id);

    // Provider bị xóa sẽ không còn được sync nữa — tự ẩn hết sản phẩm cũ của nó
    // khỏi marketplace (giữ lại data để không mất lịch sử đơn hàng liên kết)
    const { count: deactivated } = await prisma.externalProduct.updateMany({
      where: { provider: id, isEnabled: true },
      data:  { isEnabled: false },
    });

    await writeAuditLog({
      actorId:    me.id,
      action:     "DELETE_EXTERNAL_PROVIDER",
      targetType: "SystemConfig",
      targetId:   id,
      after:      { deactivatedProducts: deactivated },
    });

    return apiOk({ deleted: true, deactivated });
  } catch (err) {
    return apiCatch(err);
  }
}
