-- CreateTable
CREATE TABLE "mmo_product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_name" TEXT,
    "variant_price" DECIMAL(18,2) NOT NULL,
    "warranty" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mmo_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mmo_product_variants_product_id_idx" ON "mmo_product_variants"("product_id");

-- AddForeignKey
ALTER TABLE "mmo_product_variants" ADD CONSTRAINT "mmo_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "mmo_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
