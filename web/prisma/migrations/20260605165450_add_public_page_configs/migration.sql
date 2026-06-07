-- CreateTable
CREATE TABLE "public_page_configs" (
    "id" UUID NOT NULL,
    "page_key" VARCHAR(100) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "custom_label" VARCHAR(200),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_page_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_page_configs_page_key_key" ON "public_page_configs"("page_key");
