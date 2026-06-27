-- AlterEnum
ALTER TYPE "TxType" ADD VALUE 'ESCROW_DEPOSIT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seller_escrow" DECIMAL(18,2) NOT NULL DEFAULT 0;
