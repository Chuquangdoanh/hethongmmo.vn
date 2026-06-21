-- AlterTable
ALTER TABLE "mmo_products" ADD COLUMN     "section" "StoreType" NOT NULL DEFAULT 'TAI_NGUYEN_MMO';

-- AlterTable
ALTER TABLE "modules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "mmo_products_section_idx" ON "mmo_products"("section");
