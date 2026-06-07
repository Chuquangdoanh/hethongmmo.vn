-- AlterTable
ALTER TABLE "resource_categories" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tut_trick_categories" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;
