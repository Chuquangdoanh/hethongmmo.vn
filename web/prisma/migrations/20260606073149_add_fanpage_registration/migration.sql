-- CreateTable
CREATE TABLE "fanpage_registrations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fanpage_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fanpage_registrations_created_at_idx" ON "fanpage_registrations"("created_at");
