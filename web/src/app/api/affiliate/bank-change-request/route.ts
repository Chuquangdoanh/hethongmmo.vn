import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAffiliate } from "@/lib/auth/rbac";
import { createBankChangeRequestSchema } from "@/lib/validation/bank-change-request.schema";
import {
  submitBankChangeRequest,
  getSellerBankChangeRequests,
} from "@/lib/services/bank-change-request.service";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);
    const requests = await getSellerBankChangeRequests(me.id);
    return apiList(requests, { total: requests.length, page: 1, limit: 5, totalPages: 1 });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAffiliate(session);

    const body: unknown = await req.json();
    const parsed = createBankChangeRequestSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await submitBankChangeRequest(me.id, parsed.data);
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
