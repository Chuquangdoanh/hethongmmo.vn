-- Cho phép admin bật/tắt hiển thị từng ô input trong form đặt dịch vụ theo từng dịch vụ cụ thể.
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift như các migration trước).

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "requires_title" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "requires_sample_file" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "show_account_pass" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "show_gmail_pass" BOOLEAN NOT NULL DEFAULT true;
