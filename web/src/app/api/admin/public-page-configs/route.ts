import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { savePublicPageConfigsSchema, createPublicPageConfigSchema } from "@/lib/validation/public-page-config.schema";
import { getPublicPageConfigs, savePublicPageConfigs, createPublicPageConfig, deletePublicPageConfig } from "@/lib/services/public-page-config.service";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:read");
    const configs = await getPublicPageConfigs();
    return apiOk(configs);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "content:update");

    const body: unknown = await req.json();
    const parsed = savePublicPageConfigsSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await savePublicPageConfigs(parsed.data.configs);

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_PUBLIC_PAGE_CONFIGS",
      targetType: "PublicPageConfig",
      after:      { count: parsed.data.configs.length },
    });

    return apiOk({ updated: parsed.data.configs.length });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = createPublicPageConfigSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await createPublicPageConfig(parsed.data.pageKey, parsed.data.label);

    await writeAuditLog({
      actorId:    me.id,
      action:     "CREATE_PUBLIC_PAGE_CONFIG",
      targetType: "PublicPageConfig",
      after:      { pageKey: parsed.data.pageKey, label: parsed.data.label },
    });

    return apiOk({ pageKey: parsed.data.pageKey });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body = await req.json() as { pageKey?: unknown };
    const pageKey = typeof body.pageKey === "string" ? body.pageKey.trim() : null;
    if (!pageKey) return apiError("pageKey là bắt buộc", "VALIDATION_ERROR", 400);

    await deletePublicPageConfig(pageKey);

    await writeAuditLog({
      actorId:    me.id,
      action:     "DELETE_PUBLIC_PAGE_CONFIG",
      targetType: "PublicPageConfig",
      after:      { pageKey },
    });

    return apiOk({ deleted: true, pageKey });
  } catch (err) {
    return apiCatch(err);
  }
}
