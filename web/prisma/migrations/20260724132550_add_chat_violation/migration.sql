-- CreateEnum
CREATE TYPE "ChatViolationSource" AS ENUM ('PRESALE_CHAT', 'SUPPORT_TICKET', 'COMPLAINT_CHAT');

-- CreateTable
CREATE TABLE "chat_violations" (
    "id" UUID NOT NULL,
    "source" "ChatViolationSource" NOT NULL,
    "ref_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "matched_term" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_violations_source_created_at_idx" ON "chat_violations"("source", "created_at");

-- CreateIndex
CREATE INDEX "chat_violations_sender_id_idx" ON "chat_violations"("sender_id");

-- AddForeignKey
ALTER TABLE "chat_violations" ADD CONSTRAINT "chat_violations_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
