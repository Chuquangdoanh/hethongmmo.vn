-- CreateTable
CREATE TABLE "presale_chats" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presale_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presale_messages" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presale_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presale_chats_user_id_idx" ON "presale_chats"("user_id");

-- CreateIndex
CREATE INDEX "presale_chats_seller_id_idx" ON "presale_chats"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "presale_chats_user_id_seller_id_key" ON "presale_chats"("user_id", "seller_id");

-- CreateIndex
CREATE INDEX "presale_messages_chat_id_created_at_idx" ON "presale_messages"("chat_id", "created_at");

-- AddForeignKey
ALTER TABLE "presale_chats" ADD CONSTRAINT "presale_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presale_chats" ADD CONSTRAINT "presale_chats_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presale_messages" ADD CONSTRAINT "presale_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "presale_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presale_messages" ADD CONSTRAINT "presale_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
