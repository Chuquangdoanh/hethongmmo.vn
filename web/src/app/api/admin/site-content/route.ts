import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { z } from "zod";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import {
  getSiteContent,
  getAllSiteContent,
  upsertSiteContent,
  SITE_CONTENT_KEYS,
  type SiteContentKey,
} from "@/lib/services/site-content.service";

export const runtime = "nodejs";

const VALID_KEYS = new Set(Object.values(SITE_CONTENT_KEYS));

const patchSchema = z.object({
  key: z.string().refine((k) => VALID_KEYS.has(k as SiteContentKey), {
    message: "Key không hợp lệ",
  }),
  content: z.record(z.string(), z.unknown()),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const key = req.nextUrl.searchParams.get("key") as SiteContentKey | null;

    if (key) {
      if (!VALID_KEYS.has(key)) {
        return NextResponse.json({ error: "Key không hợp lệ", code: "INVALID_KEY" }, { status: 400 });
      }
      const content = await getSiteContent(key);
      return apiOk({ key, content });
    }

    const all = await getAllSiteContent();
    return apiOk(all);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await upsertSiteContent(parsed.data.key as SiteContentKey, parsed.data.content, me.id);

    return apiOk({ key: parsed.data.key, saved: true });
  } catch (err) {
    return apiCatch(err);
  }
}
