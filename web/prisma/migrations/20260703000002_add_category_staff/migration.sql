-- Nhân sự theo từng danh mục dịch vụ (ảnh + tên + chức vụ + mô tả)
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift/lỗi như các migration trước)

CREATE TABLE IF NOT EXISTS "category_staff" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_staff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "category_staff_category_idx" ON "category_staff"("category");
