-- Migration: chat-quota-and-auto-resolution
-- 1. Migrate OPEN → IN_REVIEW before removing enum value
UPDATE "complaints" SET "status" = 'IN_REVIEW' WHERE "status" = 'OPEN';

-- 2. Rebuild ComplaintStatus enum (add PENDING_ADMIN, remove OPEN)
ALTER TYPE "ComplaintStatus" RENAME TO "ComplaintStatus_old";
CREATE TYPE "ComplaintStatus" AS ENUM ('IN_REVIEW', 'PENDING_ADMIN', 'RESOLVED', 'REJECTED');
ALTER TABLE "complaints" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "complaints" ALTER COLUMN "status" TYPE "ComplaintStatus" USING "status"::text::"ComplaintStatus";
ALTER TABLE "complaints" ALTER COLUMN "status" SET DEFAULT 'IN_REVIEW';
DROP TYPE "ComplaintStatus_old";

-- 3. Add quota & resolution fields to chat_rooms
ALTER TABLE "chat_rooms" ADD COLUMN "total_messages"      INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "chat_rooms" ADD COLUMN "user_turn_count"     INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "chat_rooms" ADD COLUMN "first_seller_msg_at" TIMESTAMP(3);
ALTER TABLE "chat_rooms" ADD COLUMN "seller_confirmed"    BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "chat_rooms" ADD COLUMN "seller_confirmed_at" TIMESTAMP(3);
ALTER TABLE "chat_rooms" ADD COLUMN "user_done"           BOOLEAN;
