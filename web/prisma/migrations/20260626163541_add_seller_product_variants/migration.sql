-- CreateTable
CREATE TABLE "seller_product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_name" VARCHAR(100) NOT NULL,
    "variant_price" DECIMAL(18,2) NOT NULL,
    "warranty" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seller_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_product_variants_product_id_is_active_idx" ON "seller_product_variants"("product_id", "is_active");

-- AddForeignKey
ALTER TABLE "seller_product_variants" ADD CONSTRAINT "seller_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "seller_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
