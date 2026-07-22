import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { openPreSaleThread } from "@/lib/services/partner-support.service";
import { getProviderInfoBySlug } from "@/lib/external-providers/providers-config";

export const runtime = "nodejs";

const schema = z.object({ providerSlug: z.string().min(1).max(64).trim() });

// POST — buyer mở (hoặc lấy lại) chat tư vấn TRƯỚC MUA với gian hàng đối tác
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const provider = await getProviderInfoBySlug(parsed.data.providerSlug);
    if (!provider) throw new NotFoundError("Gian hàng");

    const thread = await openPreSaleThread(me.id, provider.id);
    return apiOk(thread);
  } catch (err) {
    return apiCatch(err);
  }
}
