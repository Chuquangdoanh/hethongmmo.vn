-- AlterTable
ALTER TABLE "services" ADD COLUMN     "requires_account_type" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_cccd" BOOLEAN NOT NULL DEFAULT false;
