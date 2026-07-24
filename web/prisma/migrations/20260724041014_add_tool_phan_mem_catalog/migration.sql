-- AlterEnum
ALTER TYPE "StoreType" ADD VALUE 'TOOL_PHAN_MEM';

-- DropForeignKey
ALTER TABLE "partner_support_threads" DROP CONSTRAINT "partner_support_threads_order_id_fkey";

-- AlterTable
ALTER TABLE "mmo_products" ADD COLUMN     "package_features" JSONB,
ADD COLUMN     "posted_by_user_id" UUID;

-- AlterTable
ALTER TABLE "resource_categories" ADD COLUMN     "show_in_tool_phan_mem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "seller_sub_categories" ADD COLUMN     "show_in_tool_phan_mem" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "mmo_products_posted_by_user_id_idx" ON "mmo_products"("posted_by_user_id");

-- AddForeignKey
ALTER TABLE "mmo_products" ADD CONSTRAINT "mmo_products_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_support_threads" ADD CONSTRAINT "partner_support_threads_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
