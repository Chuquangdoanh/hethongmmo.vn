-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TxType" ADD VALUE 'COURSE_DEPOSIT';
ALTER TYPE "TxType" ADD VALUE 'COURSE_FINAL_PAYMENT';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deposit_amount" DECIMAL(18,2),
ADD COLUMN     "final_paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_type" VARCHAR(20) NOT NULL DEFAULT 'FULL',
ADD COLUMN     "remaining_amount" DECIMAL(18,2);
