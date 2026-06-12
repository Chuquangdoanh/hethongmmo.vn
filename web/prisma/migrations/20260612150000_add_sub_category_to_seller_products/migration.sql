-- AlterTable: add sub_category_id to seller_products
ALTER TABLE "seller_products" ADD COLUMN "sub_category_id" UUID;

-- CreateIndex
CREATE INDEX "seller_products_sub_category_id_idx" ON "seller_products"("sub_category_id");

-- AddForeignKey
ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_sub_category_id_fkey"
  FOREIGN KEY ("sub_category_id") REFERENCES "seller_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
