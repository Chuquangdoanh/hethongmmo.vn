-- AlterTable
ALTER TABLE "affiliate_withdrawals" ADD COLUMN     "bank_account_holder_enc" BYTEA,
ADD COLUMN     "bank_account_number_enc" BYTEA,
ADD COLUMN     "bank_name_enc" BYTEA,
ADD COLUMN     "fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 0;
