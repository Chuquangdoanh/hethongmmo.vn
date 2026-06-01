import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { createReview } from "@/lib/services/review.service";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(1000).trim().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const review = await createReview({ userId: me.id, ...parsed.data });
    return apiOk(review, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
