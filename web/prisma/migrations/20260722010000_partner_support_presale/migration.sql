-- Enum PartnerSupportKind (idempotent)
DO $$ BEGIN
  CREATE TYPE "PartnerSupportKind" AS ENUM ('ORDER', 'PRESALE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Them cot kind (mac dinh ORDER cho du lieu cu)
ALTER TABLE "partner_support_threads" ADD COLUMN IF NOT EXISTS "kind" "PartnerSupportKind" NOT NULL DEFAULT 'ORDER';

-- Cho phep order_id NULL (thread tu van truoc mua khong gan don)
ALTER TABLE "partner_support_threads" ALTER COLUMN "order_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "partner_support_threads_kind_idx" ON "partner_support_threads"("kind");