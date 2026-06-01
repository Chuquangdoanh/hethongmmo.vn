-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'VIP');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seller_tier" "SellerTier" NOT NULL DEFAULT 'STANDARD';
