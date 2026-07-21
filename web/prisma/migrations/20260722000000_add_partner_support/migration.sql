-- Enum PartnerSupportStatus (idempotent)
DO $$ BEGIN
  CREATE TYPE "PartnerSupportStatus" AS ENUM ('OPEN', 'RESOLVED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Order: co hoan tien doi tac (giu status DONE)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "partner_refunded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "partner_refunded_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "partner_refund_reason" TEXT;

-- Bang thread ho tro doi tac
CREATE TABLE IF NOT EXISTS "partner_support_threads" (
  "id"            UUID NOT NULL,
  "order_id"      UUID NOT NULL,
  "user_id"       UUID NOT NULL,
  "provider_id"   VARCHAR(50) NOT NULL,
  "provider_name" TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "status"        "PartnerSupportStatus" NOT NULL DEFAULT 'OPEN',
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_support_threads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_support_threads_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "partner_support_threads_user_id_fkey"  FOREIGN KEY ("user_id")  REFERENCES "users"("id")  ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_support_threads_order_id_key" ON "partner_support_threads"("order_id");
CREATE INDEX IF NOT EXISTS "partner_support_threads_user_id_idx"     ON "partner_support_threads"("user_id");
CREATE INDEX IF NOT EXISTS "partner_support_threads_status_idx"      ON "partner_support_threads"("status");
CREATE INDEX IF NOT EXISTS "partner_support_threads_provider_id_idx" ON "partner_support_threads"("provider_id");

-- Bang tin nhan
CREATE TABLE IF NOT EXISTS "partner_support_messages" (
  "id"          UUID NOT NULL,
  "thread_id"   UUID NOT NULL,
  "sender_id"   UUID NOT NULL,
  "sender_name" TEXT NOT NULL,
  "sender_role" VARCHAR(10) NOT NULL,
  "content"     TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_support_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "partner_support_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "partner_support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "partner_support_messages_thread_id_created_at_idx" ON "partner_support_messages"("thread_id", "created_at");
