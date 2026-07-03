-- Thông báo đơn hàng qua Telegram cho seller
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift/lỗi rename như các migration trước)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_telegram_chat_id" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_token" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_link_token_key" ON "users"("telegram_link_token");
