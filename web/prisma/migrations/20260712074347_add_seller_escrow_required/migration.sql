-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seller_escrow_required" DECIMAL(18,2) NOT NULL DEFAULT 1000000;
