-- AlterTable
ALTER TABLE "external_products" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_type" "FavoriteProductType" NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_images_product_type_product_id_created_at_idx" ON "product_images"("product_type", "product_id", "created_at");
