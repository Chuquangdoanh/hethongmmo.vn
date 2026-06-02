-- CreateTable
CREATE TABLE "tut_trick_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tut_trick_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tut_trick_categories_name_key" ON "tut_trick_categories"("name");

-- CreateIndex
CREATE INDEX "tut_trick_categories_name_idx" ON "tut_trick_categories"("name");
