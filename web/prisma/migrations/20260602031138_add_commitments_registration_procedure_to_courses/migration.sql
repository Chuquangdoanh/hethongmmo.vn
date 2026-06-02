-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "commitments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "registration_procedure" TEXT;
