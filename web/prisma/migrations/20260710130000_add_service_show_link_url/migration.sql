-- Cho phép admin ẩn/hiện ô "Link URL / IMEI" trong form đặt dịch vụ theo từng dịch vụ cụ thể.
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift như các migration trước).

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "show_link_url" BOOLEAN NOT NULL DEFAULT true;
