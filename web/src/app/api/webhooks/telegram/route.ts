import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { sendSellerTelegram, escTelegramHtml } from "@/lib/services/telegram-alert.service";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

// Telegram gửi update khi seller bấm Start bot. Ta chỉ quan tâm message "/start <token>".
const updateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({ id: z.number() }),
    })
    .optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Luôn trả 200 để Telegram không retry dồn dập — mọi nhánh lỗi đều { ok: true }.

  // 1. Verify secret token Telegram gửi kèm (set lúc đăng ký webhook)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("TELEGRAM_WEBHOOK_SECRET chưa cấu hình — bỏ qua webhook");
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (headerSecret !== secret) {
    logger.warn("Telegram webhook: secret token không khớp");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 2. Parse + validate update
  let parsed: ReturnType<typeof updateSchema.safeParse>;
  try {
    parsed = updateSchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (!parsed.success || !parsed.data.message) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { text, chat } = parsed.data.message;
  const chatId = String(chat.id);

  // 3. Chỉ xử lý "/start <token>"
  const startMatch = text?.match(/^\/start\s+([A-Za-z0-9_-]{16,64})$/);
  if (!startMatch) {
    await sendSellerTelegram(
      chatId,
      "Chào bạn 👋\nĐể nhận thông báo đơn hàng, vui lòng bấm nút <b>Kết nối Telegram</b> trong gian hàng của bạn trên website.",
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const token = startMatch[1]!;

  // 4. Tìm user theo token 1 lần → gán chat_id, xoá token
  try {
    const user = await prisma.user.findUnique({
      where: { telegramLinkToken: token },
      select: { id: true, fullName: true },
    });
    if (!user) {
      await sendSellerTelegram(
        chatId,
        "Liên kết đã hết hạn hoặc không hợp lệ ❌\nVui lòng vào gian hàng và bấm <b>Kết nối Telegram</b> lại.",
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { sellerTelegramChatId: chatId, telegramLinkToken: null },
    });

    await sendSellerTelegram(
      chatId,
      `✅ <b>Kết nối thành công!</b>\n\nXin chào ${escTelegramHtml(user.fullName)}, từ giờ bạn sẽ nhận được thông báo mỗi khi có đơn hàng mới.`,
    );
    logger.info({ userId: user.id }, "Telegram seller connected");
  } catch (err) {
    logger.error({ err }, "Telegram webhook: lỗi khi lưu chat_id");
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
