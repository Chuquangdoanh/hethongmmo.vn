-- Lifetime Affiliate — IDEMPOTENT rewrite.
--
-- Nguyên bản migration này được sinh bằng `prisma migrate diff` trên một dev DB
-- đang bị drift, nên nó lẫn cả các lệnh RENAME khuongfb→external. Trên production
-- (nơi 20260629_rename_khuongfb_to_external đã chạy đúng), các RENAME đó thất bại
-- (constraint/index tên cũ không còn tồn tại) → cả migration rollback → bảng
-- affiliate không được tạo. Toàn bộ statement dưới đây được bọc guard để chạy lại
-- an toàn trên mọi trạng thái DB (giống pattern của 20260629).

-- CreateEnum (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliateStatus') THEN
    CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'LOCKED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliateCommissionStatus') THEN
    CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'VOIDED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliateWithdrawalStatus') THEN
    CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
  END IF;
END $$;

-- AlterEnum (idempotent)
ALTER TYPE "TxType" ADD VALUE IF NOT EXISTS 'AFFILIATE_COMMISSION';
ALTER TYPE "TxType" ADD VALUE IF NOT EXISTS 'AFFILIATE_COMMISSION_VOID';
ALTER TYPE "TxType" ADD VALUE IF NOT EXISTS 'AFFILIATE_WITHDRAWAL_FEE';

-- Rename external_products PK constraint (chỉ khi còn tên cũ)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khuongfb_products_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_products_pkey') THEN
    ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_pkey" TO "external_products_pkey";
  END IF;
END $$;

-- AlterTable users (idempotent columns)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "affiliate_code" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "affiliate_joined_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "affiliate_status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_affiliate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referrer_affiliate_id" UUID;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "affiliate_commission_rules" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID,
    "product_id" UUID,
    "category_id" UUID,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_amount" DECIMAL(18,2) NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "landing_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "affiliate_withdrawals" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "net_amount" DECIMAL(18,2) NOT NULL,
    "qualifying_commission_ids" JSONB NOT NULL,
    "status" "AffiliateWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "processed_by_user_id" UUID,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "affiliate_commission_rules_affiliate_id_idx" ON "affiliate_commission_rules"("affiliate_id");
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_commissions_order_id_key" ON "affiliate_commissions"("order_id");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_affiliate_id_status_idx" ON "affiliate_commissions"("affiliate_id", "status");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_customer_id_idx" ON "affiliate_commissions"("customer_id");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_created_at_idx" ON "affiliate_commissions"("created_at");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_affiliate_id_created_at_idx" ON "affiliate_clicks"("affiliate_id", "created_at");
CREATE INDEX IF NOT EXISTS "affiliate_withdrawals_affiliate_id_status_idx" ON "affiliate_withdrawals"("affiliate_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "users_affiliate_code_key" ON "users"("affiliate_code");
CREATE INDEX IF NOT EXISTS "users_affiliate_code_idx" ON "users"("affiliate_code");
CREATE INDEX IF NOT EXISTS "users_referrer_affiliate_id_idx" ON "users"("referrer_affiliate_id");
CREATE INDEX IF NOT EXISTS "users_is_affiliate_affiliate_status_idx" ON "users"("is_affiliate", "affiliate_status");

-- RenameForeignKey external_products (chỉ khi còn tên cũ)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khuongfb_products_resource_category_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_products_resource_category_id_fkey') THEN
    ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_resource_category_id_fkey" TO "external_products_resource_category_id_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khuongfb_products_sub_category_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_products_sub_category_id_fkey') THEN
    ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_sub_category_id_fkey" TO "external_products_sub_category_id_fkey";
  END IF;
END $$;

-- Orders FK: trên prod đã đổi tên qua drop+add ở 20260629; chỉ rename nếu vẫn còn tên cũ
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_khuongfb_product_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_external_product_id_fkey') THEN
    ALTER TABLE "orders" RENAME CONSTRAINT "orders_khuongfb_product_id_fkey" TO "orders_external_product_id_fkey";
  END IF;
END $$;

-- AddForeignKey (chỉ thêm nếu chưa có)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_referrer_affiliate_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_referrer_affiliate_id_fkey" FOREIGN KEY ("referrer_affiliate_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_commission_rules_affiliate_id_fkey') THEN
    ALTER TABLE "affiliate_commission_rules" ADD CONSTRAINT "affiliate_commission_rules_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_commissions_affiliate_id_fkey') THEN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_commissions_customer_id_fkey') THEN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_commissions_order_id_fkey') THEN
    ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_clicks_affiliate_id_fkey') THEN
    ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_withdrawals_affiliate_id_fkey') THEN
    ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- RenameIndex external_products (chỉ khi còn tên cũ)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_display_section_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_display_section_idx') THEN
    ALTER INDEX "khuongfb_products_display_section_idx" RENAME TO "external_products_display_section_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_external_id_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_external_id_key') THEN
    ALTER INDEX "khuongfb_products_external_id_key" RENAME TO "external_products_external_id_key";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_is_enabled_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_is_enabled_idx') THEN
    ALTER INDEX "khuongfb_products_is_enabled_idx" RENAME TO "external_products_is_enabled_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_provider_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_provider_idx') THEN
    ALTER INDEX "khuongfb_products_provider_idx" RENAME TO "external_products_provider_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_provider_is_enabled_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_provider_is_enabled_idx') THEN
    ALTER INDEX "khuongfb_products_provider_is_enabled_idx" RENAME TO "external_products_provider_is_enabled_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_resource_category_id_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_resource_category_id_idx') THEN
    ALTER INDEX "khuongfb_products_resource_category_id_idx" RENAME TO "external_products_resource_category_id_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'khuongfb_products_sub_category_id_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'external_products_sub_category_id_idx') THEN
    ALTER INDEX "khuongfb_products_sub_category_id_idx" RENAME TO "external_products_sub_category_id_idx";
  END IF;
END $$;
