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

function maskProviderSecrets(entry: ProviderEntry): ProviderEntry {
  return {
    ...entry,
    ...(entry.apiKey    ? { apiKey: maskApiKey(entry.apiKey) }       : {}),
    ...(entry.apiSecret ? { apiSecret: maskApiKey(entry.apiSecret) } : {}),
  };
}

// GET — danh sách providers (apiKey/apiSecret bị mask)
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const configs = await getProviderConfigs();
    return apiOk(configs.map(maskProviderSecrets));
  } catch (err) {
    return apiCatch(err);
  }
}

const addSchema = z.object({
  name:         z.string().min(1).max(100).trim(),
  providerType: z.enum(["khuongfb", "vncloud"]).default("khuongfb"),
  // khuongfb-compatible
  baseUrl:      z.string().url("URL không hợp lệ").trim().optional(),
  apiKey:       z.string().min(8, "API key quá ngắn").trim().optional(),
  // vncloud
  apiUsername:  z.string().min(1, "Thiếu API Username").trim().optional(),
  apiApp:       z.string().min(1, "Thiếu API App").trim().optional(),
  apiSecret:    z.string().min(8, "API Secret quá ngắn").trim().optional(),
  imageUrl:     z.string().url("URL ảnh không hợp lệ").max(2000).trim().optional(),
}).refine(
  (data) => data.providerType === "vncloud"
    ? !!(data.apiUsername && data.apiApp && data.apiSecret)
    : !!(data.baseUrl && data.apiKey),
  { message: "Thiếu thông tin xác thực bắt buộc theo loại provider" },
);

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/gi, "-");
}

// ID cố định theo domain/tài khoản (không random) — nếu provider bị xóa rồi thêm lại với cùng
// baseUrl (khuongfb-compatible) hoặc cùng apiUsername (vncloud), ID sẽ trùng ID cũ, tự động khớp
// lại với sản phẩm đã đồng bộ trước đó thay vì bị "mồ côi"
function buildProviderId(data: z.infer<typeof addSchema>): string {
  if (data.providerType === "vncloud") return slugify(data.apiUsername!);
  const host = new URL(data.baseUrl!).hostname.replace(/^www\./, "");
  return slugify(host);
}

// POST — thêm provider mới
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const configs = await getProviderConfigs();
    const baseId = buildProviderId(parsed.data);
    if (configs.some(c => c.id === baseId)) {
      return apiValidationError([{ message: "Domain/tài khoản này đã được thêm rồi" }]);
    }
    const newId = baseId || randomBytes(4).toString("hex");
    const newEntry: ProviderEntry = {
      id:           newId,
      name:         parsed.data.name,
      providerType: parsed.data.providerType,
      enabled:      true,
      ...(parsed.data.baseUrl     ? { baseUrl: parsed.data.baseUrl }         : {}),
      ...(parsed.data.apiKey      ? { apiKey: parsed.data.apiKey }           : {}),
      ...(parsed.data.apiUsername ? { apiUsername: parsed.data.apiUsername } : {}),
      ...(parsed.data.apiApp      ? { apiApp: parsed.data.apiApp }           : {}),
      ...(parsed.data.apiSecret   ? { apiSecret: parsed.data.apiSecret }     : {}),
      ...(parsed.data.imageUrl    ? { imageUrl: parsed.data.imageUrl }       : {}),
    };
    await saveProviderConfigs([...configs, newEntry], me.id);

    await writeAuditLog({
      actorId:    me.id,
      action:     "ADD_EXTERNAL_PROVIDER",
      targetType: "SystemConfig",
      targetId:   newId,
      after:      { name: parsed.data.name, providerType: parsed.data.providerType },
    });

    return apiOk(maskProviderSecrets(newEntry));
  } catch (err) {
    return apiCatch(err);
  }
}

const patchSchema = z.object({
  id:          z.string(),
  name:        z.string().min(1).max(100).trim().optional(),
  baseUrl:     z.string().url("URL không hợp lệ").trim().optional(),
  apiKey:      z.string().min(8, "API key quá ngắn").trim().optional(),
  apiUsername: z.string().min(1).trim().optional(),
  apiApp:      z.string().min(1).trim().optional(),
  apiSecret:   z.string().min(8, "API Secret quá ngắn").trim().optional(),
  enabled:     z.boolean().optional(),
  // Cho phép "" để xóa ảnh (gỡ logo gian hàng)
  imageUrl:    z.union([z.string().url("URL ảnh không hợp lệ").max(2000).trim(), z.literal("")]).optional(),
  // Hạng gian hàng (key SellerTierDefinition); "" để bỏ gán hạng
  tierKey:     z.union([z.string().max(50).trim(), z.literal("")]).optional(),
});

// PATCH — cập nhật provider (bật/tắt, đổi key, đổi tên)
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
    // imageUrl === "" nghĩa là gỡ logo → bỏ hẳn field thay vì lưu chuỗi rỗng
    if (parsed.data.imageUrl === "") delete updated.imageUrl;
    // tierKey === "" nghĩa là bỏ gán hạng
    if (parsed.data.tierKey === "") delete updated.tierKey;
    configs[idx] = updated;
    await saveProviderConfigs(configs, me.id);

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_EXTERNAL_PROVIDER",
      targetType: "SystemConfig",
      targetId:   parsed.data.id,
      after:      { name: updated.name, enabled: updated.enabled },
    });

    return apiOk(maskProviderSecrets(updated));
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
