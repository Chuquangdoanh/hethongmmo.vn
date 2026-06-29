import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { khuongfbGetProductDetail } from "@/lib/khuongfb/client";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/admin/khuongfb/product-detail-test?id=9079
// Route tạm để xem raw response của Khuongfb product detail API
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const id = req.nextUrl.searchParams.get("id") ?? "9079";
    const detail = await khuongfbGetProductDetail(id);
    return apiOk({ productId: id, rawDetail: detail });
  } catch (err) {
    return apiCatch(err);
  }
}
