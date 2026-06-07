-- AlterTable
ALTER TABLE "ads_registrations" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "fanpage_registrations" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ads_registrations_status_idx" ON "ads_registrations"("status");

-- CreateIndex
CREATE INDEX "fanpage_registrations_status_idx" ON "fanpage_registrations"("status");
