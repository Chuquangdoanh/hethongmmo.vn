-- Duyệt đăng sản phẩm seller — bọc guard idempotent theo pattern của
-- 20260701000001_add_lifetime_affiliate (dev DB có drift ngoài phạm vi migration này
-- ở bảng external_products, nên viết tay thay vì sinh bằng `prisma migrate diff`).

-- CreateEnum (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SellerProductApprovalStatus') THEN
    CREATE TYPE "SellerProductApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- AlterTable seller_products (idempotent columns)
ALTER TABLE "seller_products" ADD COLUMN IF NOT EXISTS "approval_status" "SellerProductApprovalStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "seller_products" ADD COLUMN IF NOT EXISTS "approval_reject_reason" TEXT;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "seller_products_approval_status_idx" ON "seller_products"("approval_status");
