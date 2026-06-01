-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "requires_account_type" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_cccd" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "mmo_products" ADD COLUMN     "requires_account_type" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_cccd" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tut_tricks" ADD COLUMN     "requires_account_type" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_cccd" BOOLEAN NOT NULL DEFAULT false;
