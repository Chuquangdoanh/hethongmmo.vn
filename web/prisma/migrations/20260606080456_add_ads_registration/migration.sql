-- CreateTable
CREATE TABLE "ads_registrations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_tab" TEXT NOT NULL,
    "fanpage_status" TEXT NOT NULL,
    "has_content" TEXT NOT NULL,
    "ads_experience" TEXT NOT NULL,
    "product_category" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_registrations_created_at_idx" ON "ads_registrations"("created_at");
