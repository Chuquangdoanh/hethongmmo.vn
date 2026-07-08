-- Coupon system: mã giảm giá cho Kho tài nguyên / Tài nguyên MMO / Khương FB
-- Idempotent: an toàn khi chạy lại trên prod (tránh drift/lỗi như các migration trước)

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" DECIMAL(18,2) NOT NULL,
    "max_uses" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "min_order_value" DECIMAL(18,2),
    "min_tier_label" VARCHAR(20),
    "new_user_only" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "coupon_products" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "product_type" "OrderType" NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_is_active_start_at_end_at_idx" ON "coupons"("is_active", "start_at", "end_at");

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_products_coupon_id_product_type_product_id_key" ON "coupon_products"("coupon_id", "product_type", "product_id");
CREATE INDEX IF NOT EXISTS "coupon_products_product_type_product_id_idx" ON "coupon_products"("product_type", "product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_user_id_key" ON "coupon_redemptions"("coupon_id", "user_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (orders: liên kết coupon đã dùng để hiển thị/audit)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_id" UUID;

DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
