import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { registerSeller, getRegistrationFee } from "@/lib/services/seller.service";
import { sellerRegisterRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { apiOk, apiSuccess, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const [user, registrationFee] = await Promise.all([
      prisma.user.findUnique({
        where: { id: me.id },
        select: {
          sellerStatus: true,
          sellerCategory: true,
          sellerRequest: {
            select: {
              id: true, category: true, storeType: true, status: true,
              rejectReason: true, createdAt: true, approvedAt: true, rejectedAt: true,
            },
          },
        },
      }),
      getRegistrationFee(),
    ]);

    return apiOk({ ...user, registrationFee });
  } catch (err) {
    return apiCatch(err);
  }
}

const registerSchema = z.object({
  category:       z.string().min(1).max(250).trim(),
  subCategoryIds: z.array(z.string().uuid()).max(20).optional().default([]),
  storeType:      z.enum(["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN"]).optional().default("TAI_NGUYEN_MMO"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    // Rate limit: 3 requests per hour per user
    const rl = await checkRateLimit(sellerRegisterRatelimit, `seller-register:${me.id}`);
    if (!rl.success) {
      return apiError("Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 1 giờ.", "RATE_LIMITED", 429);
    }

    // Kiểm tra profile bắt buộc trước khi cho phép đăng ký
    const profileCheck = await prisma.user.findUnique({
      where: { id: me.id },
      select: { phone: true, facebookUrl: true, telegramUsername: true },
    });
    if (!profileCheck?.phone || !profileCheck.facebookUrl || !profileCheck.telegramUsername) {
      return apiError(
        "Vui lòng cập nhật đầy đủ Số điện thoại, Facebook và Telegram trong hồ sơ trước khi đăng ký bán hàng.",
        "PROFILE_INCOMPLETE",
        400,
      );
    }

    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    await registerSeller({ userId: me.id, category: parsed.data.category, subCategoryIds: parsed.data.subCategoryIds, storeType: parsed.data.storeType, ip });

    return apiSuccess("Yêu cầu đăng ký bán hàng đã được gửi. Chờ admin xét duyệt.");
  } catch (err) {
    return apiCatch(err);
  }
}
