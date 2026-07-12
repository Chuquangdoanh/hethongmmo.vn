-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seller_reverify_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seller_reverify_required" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "seller_reverify_requests" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "cccd_image_url" TEXT NOT NULL,
    "portrait_image_url" TEXT NOT NULL,
    "status" "BankChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_reverify_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_reverify_requests_seller_id_status_idx" ON "seller_reverify_requests"("seller_id", "status");

-- CreateIndex
CREATE INDEX "seller_reverify_requests_status_created_at_idx" ON "seller_reverify_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "seller_reverify_requests" ADD CONSTRAINT "seller_reverify_requests_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
