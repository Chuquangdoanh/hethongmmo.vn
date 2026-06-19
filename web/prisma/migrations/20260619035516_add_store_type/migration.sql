-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('TAI_NGUYEN_MMO', 'KHO_TAI_NGUYEN');

-- AlterTable
ALTER TABLE "seller_products" ADD COLUMN     "store_type" "StoreType" NOT NULL DEFAULT 'TAI_NGUYEN_MMO';

-- AlterTable
ALTER TABLE "seller_requests" ADD COLUMN     "store_type" "StoreType" NOT NULL DEFAULT 'TAI_NGUYEN_MMO';
