import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { submitSellerReverifySchema } from "@/lib/validation/seller-reverify.schema";
import {
  submitSellerReverify,
  getSellerReverifyRequests,
} from "@/lib/services/seller-reverify.service";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }
    const requests = await getSellerReverifyRequests(me.id);
    return apiList(requests, { total: requests.length, page: 1, limit: 5, totalPages: 1 });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    if (me.sellerStatus !== "APPROVED") {
      return NextResponse.json({ error: "Chưa được duyệt làm seller", code: "FORBIDDEN" }, { status: 403 });
    }

    const body: unknown = await req.json();
    const parsed = submitSellerReverifySchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await submitSellerReverify(me.id, parsed.data);
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
