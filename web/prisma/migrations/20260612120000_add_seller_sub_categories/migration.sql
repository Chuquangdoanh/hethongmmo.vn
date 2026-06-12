-- CreateTable
CREATE TABLE "seller_sub_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sub_categories" (
    "user_id" UUID NOT NULL,
    "sub_category_id" UUID NOT NULL,

    CONSTRAINT "user_sub_categories_pkey" PRIMARY KEY ("user_id","sub_category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_sub_categories_category_name_name_key" ON "seller_sub_categories"("category_name", "name");

-- CreateIndex
CREATE INDEX "seller_sub_categories_category_name_is_active_idx" ON "seller_sub_categories"("category_name", "is_active");

-- AddForeignKey
ALTER TABLE "seller_sub_categories" ADD CONSTRAINT "seller_sub_categories_category_name_fkey" FOREIGN KEY ("category_name") REFERENCES "resource_categories"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sub_categories" ADD CONSTRAINT "user_sub_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sub_categories" ADD CONSTRAINT "user_sub_categories_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "seller_sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
