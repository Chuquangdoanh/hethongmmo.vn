import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { savePublicPageConfigsSchema } from "@/lib/validation/public-page-config.schema";
import { getPublicPageConfigs, savePublicPageConfigs } from "@/lib/services/public-page-config.service";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const configs = await getPublicPageConfigs();
    return apiOk(configs);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

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
