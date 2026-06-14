-- CreateEnum
CREATE TYPE "BankChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "bank_change_requests" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "bank_name_enc" BYTEA NOT NULL,
    "bank_account_number_enc" BYTEA NOT NULL,
    "bank_account_holder_enc" BYTEA NOT NULL,
    "status" "BankChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_change_requests_seller_id_status_idx" ON "bank_change_requests"("seller_id", "status");

-- CreateIndex
CREATE INDEX "bank_change_requests_status_created_at_idx" ON "bank_change_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "bank_change_requests" ADD CONSTRAINT "bank_change_requests_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
