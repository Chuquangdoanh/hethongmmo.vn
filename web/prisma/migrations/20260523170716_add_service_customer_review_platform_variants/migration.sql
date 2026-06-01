-- AlterTable
ALTER TABLE "services" ADD COLUMN     "customer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platform_variants" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;
