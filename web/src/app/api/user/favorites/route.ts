import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { toggleFavoriteSchema, getFavoritesQuerySchema } from "@/lib/validation/favorite.schema";
import { toggleFavorite, getUserFavorites } from "@/lib/services/favorite.service";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

/** GET /api/user/favorites — danh sách sản phẩm đã yêu thích */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const query = getFavoritesQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!query.success) return apiValidationError(query.error.issues);

    const { page, limit } = query.data;
    const result = await getUserFavorites(me.id, page, limit);

    return apiList(result.items, {
      total: result.total,
      page,
      limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return apiCatch(err);
  }
}

/** POST /api/user/favorites — toggle yêu thích (like / unlike) */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = toggleFavoriteSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const result = await toggleFavorite(me.id, parsed.data.productType, parsed.data.productId);
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
