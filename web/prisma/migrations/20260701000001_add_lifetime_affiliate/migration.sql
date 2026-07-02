-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TxType" ADD VALUE 'AFFILIATE_COMMISSION';
ALTER TYPE "TxType" ADD VALUE 'AFFILIATE_COMMISSION_VOID';
ALTER TYPE "TxType" ADD VALUE 'AFFILIATE_WITHDRAWAL_FEE';

-- AlterTable
ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_pkey" TO "external_products_pkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "affiliate_code" VARCHAR(32),
ADD COLUMN     "affiliate_joined_at" TIMESTAMP(3),
ADD COLUMN     "affiliate_status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "is_affiliate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referrer_affiliate_id" UUID;

-- CreateTable
CREATE TABLE "affiliate_commission_rules" (
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

-- CreateTable
CREATE TABLE "affiliate_commissions" (
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

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "landing_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_withdrawals" (
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

-- CreateIndex
CREATE INDEX "affiliate_commission_rules_affiliate_id_idx" ON "affiliate_commission_rules"("affiliate_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_order_id_key" ON "affiliate_commissions"("order_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliate_id_status_idx" ON "affiliate_commissions"("affiliate_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_commissions_customer_id_idx" ON "affiliate_commissions"("customer_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_created_at_idx" ON "affiliate_commissions"("created_at");

-- CreateIndex
CREATE INDEX "affiliate_clicks_affiliate_id_created_at_idx" ON "affiliate_clicks"("affiliate_id", "created_at");

-- CreateIndex
CREATE INDEX "affiliate_withdrawals_affiliate_id_status_idx" ON "affiliate_withdrawals"("affiliate_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_affiliate_code_key" ON "users"("affiliate_code");

-- CreateIndex
CREATE INDEX "users_affiliate_code_idx" ON "users"("affiliate_code");

-- CreateIndex
CREATE INDEX "users_referrer_affiliate_id_idx" ON "users"("referrer_affiliate_id");

-- CreateIndex
CREATE INDEX "users_is_affiliate_affiliate_status_idx" ON "users"("is_affiliate", "affiliate_status");

-- RenameForeignKey
ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_resource_category_id_fkey" TO "external_products_resource_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "external_products" RENAME CONSTRAINT "khuongfb_products_sub_category_id_fkey" TO "external_products_sub_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_khuongfb_product_id_fkey" TO "orders_external_product_id_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referrer_affiliate_id_fkey" FOREIGN KEY ("referrer_affiliate_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_rules" ADD CONSTRAINT "affiliate_commission_rules_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "khuongfb_products_display_section_idx" RENAME TO "external_products_display_section_idx";

-- RenameIndex
ALTER INDEX "khuongfb_products_external_id_key" RENAME TO "external_products_external_id_key";

-- RenameIndex
ALTER INDEX "khuongfb_products_is_enabled_idx" RENAME TO "external_products_is_enabled_idx";

-- RenameIndex
ALTER INDEX "khuongfb_products_provider_idx" RENAME TO "external_products_provider_idx";

-- RenameIndex
ALTER INDEX "khuongfb_products_provider_is_enabled_idx" RENAME TO "external_products_provider_is_enabled_idx";

-- RenameIndex
ALTER INDEX "khuongfb_products_resource_category_id_idx" RENAME TO "external_products_resource_category_id_idx";

-- RenameIndex
ALTER INDEX "khuongfb_products_sub_category_id_idx" RENAME TO "external_products_sub_category_id_idx";

