-- AlterTable
ALTER TABLE "seller_sub_categories" ADD COLUMN     "show_in_kho_tai_nguyen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_in_tai_nguyen_mmo" BOOLEAN NOT NULL DEFAULT true;
