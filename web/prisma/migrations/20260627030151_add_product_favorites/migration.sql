-- CreateEnum
CREATE TYPE "FavoriteProductType" AS ENUM ('SERVICE', 'COURSE', 'TUTTRICK', 'MMO_PRODUCT', 'SELLER_PRODUCT');

-- CreateTable
CREATE TABLE "product_favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_type" "FavoriteProductType" NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_favorites_user_id_idx" ON "product_favorites"("user_id");

-- CreateIndex
CREATE INDEX "product_favorites_product_type_product_id_idx" ON "product_favorites"("product_type", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_favorites_user_id_product_type_product_id_key" ON "product_favorites"("user_id", "product_type", "product_id");

-- AddForeignKey
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
