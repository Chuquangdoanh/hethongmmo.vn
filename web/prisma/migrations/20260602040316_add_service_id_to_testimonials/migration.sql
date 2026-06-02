-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN     "service_id" UUID;

-- CreateIndex
CREATE INDEX "testimonials_service_id_is_active_idx" ON "testimonials"("service_id", "is_active");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
