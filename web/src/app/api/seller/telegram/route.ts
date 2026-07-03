import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiSuccess, apiCatch, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET — trạng thái kết nối Telegram của seller hiện tại
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { sellerTelegramChatId: true },
    });

    return apiOk({ connected: !!user?.sellerTelegramChatId });
  } catch (err) {
    return apiCatch(err);
  }
}

// POST — sinh token 1 lần + trả deep link để seller bấm Start bot
export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    // Bỏ "@" nếu lỡ cấu hình dư — deep link t.me/<username> không được có @
    const botUsername = process.env.TELEGRAM_SELLER_BOT_USERNAME?.replace(/^@/, "");
    if (!botUsername) {
      return apiError("Tính năng thông báo Telegram chưa được cấu hình.", "TELEGRAM_NOT_CONFIGURED", 503);
    }

    // Token bảo mật (không dùng Math.random) — khớp regex webhook [A-Za-z0-9_-]{16,64}
    const token = randomBytes(24).toString("base64url");

    await prisma.user.update({
      where: { id: me.id },
      data: { telegramLinkToken: token },
    });

    const deepLink = `https://t.me/${botUsername}?start=${token}`;
    return apiOk({ deepLink });
  } catch (err) {
    return apiCatch(err);
  }
}

// DELETE — ngắt kết nối Telegram
export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    await prisma.user.update({
      where: { id: me.id },
      data: { sellerTelegramChatId: null, telegramLinkToken: null },
    });

    return apiSuccess("Đã ngắt kết nối Telegram");
  } catch (err) {
    return apiCatch(err);
  }
}
