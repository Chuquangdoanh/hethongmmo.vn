-- Enum ProductOriginType (idempotent)
DO $$ BEGIN
  CREATE TYPE "ProductOriginType" AS ENUM ('SELF_CREATED', 'SELF_RAISED', 'BOUGHT_INDIVIDUAL', 'BOUGHT_BUSINESS', 'LEGAL_TRANSFER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Nguon goc san pham (nullable cho du lieu cu)
ALTER TABLE "seller_products" ADD COLUMN IF NOT EXISTS "origin_type" "ProductOriginType";
ALTER TABLE "seller_products" ADD COLUMN IF NOT EXISTS "origin_description" TEXT;
ALTER TABLE "seller_products" ADD COLUMN IF NOT EXISTS "origin_commitment" BOOLEAN NOT NULL DEFAULT false;
