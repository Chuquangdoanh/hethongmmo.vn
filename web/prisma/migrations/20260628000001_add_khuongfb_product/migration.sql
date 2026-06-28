-- Add KHUONGFB_PRODUCT to OrderType enum
ALTER TYPE "OrderType" ADD VALUE 'KHUONGFB_PRODUCT';

-- Add KHUONGFB_PRODUCT to FavoriteProductType enum
ALTER TYPE "FavoriteProductType" ADD VALUE 'KHUONGFB_PRODUCT';

-- Add BUY_KHUONGFB_PRODUCT to TxType enum
ALTER TYPE "TxType" ADD VALUE 'BUY_KHUONGFB_PRODUCT';

-- Add external order tracking columns to orders
ALTER TABLE "orders" ADD COLUMN "external_order_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "external_source" VARCHAR(50);
ALTER TABLE "orders" ADD COLUMN "khuongfb_product_id" UUID;

-- Update max_seller_products default
ALTER TABLE "users" ALTER COLUMN "max_seller_products" SET DEFAULT 10;

-- Create khuongfb_products table
CREATE TABLE "khuongfb_products" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "original_price" DECIMAL(18,2) NOT NULL,
    "sale_price" DECIMAL(18,2) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "warranty_info" TEXT,
    "display_section" "StoreType" NOT NULL DEFAULT 'TAI_NGUYEN_MMO',
    "resource_category_id" UUID,
    "sub_category_id" UUID,
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "khuongfb_products_pkey" PRIMARY KEY ("id")
);

-- Unique and search indices
CREATE UNIQUE INDEX "khuongfb_products_external_id_key" ON "khuongfb_products"("external_id");
CREATE INDEX "khuongfb_products_is_enabled_idx" ON "khuongfb_products"("is_enabled");
CREATE INDEX "khuongfb_products_display_section_idx" ON "khuongfb_products"("display_section");
CREATE INDEX "khuongfb_products_resource_category_id_idx" ON "khuongfb_products"("resource_category_id");
CREATE INDEX "khuongfb_products_sub_category_id_idx" ON "khuongfb_products"("sub_category_id");

-- Foreign keys for khuongfb_products
ALTER TABLE "khuongfb_products" ADD CONSTRAINT "khuongfb_products_resource_category_id_fkey"
    FOREIGN KEY ("resource_category_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "khuongfb_products" ADD CONSTRAINT "khuongfb_products_sub_category_id_fkey"
    FOREIGN KEY ("sub_category_id") REFERENCES "seller_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key on orders
ALTER TABLE "orders" ADD CONSTRAINT "orders_khuongfb_product_id_fkey"
    FOREIGN KEY ("khuongfb_product_id") REFERENCES "khuongfb_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
