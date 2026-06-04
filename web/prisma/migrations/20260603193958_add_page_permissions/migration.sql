-- CreateTable
CREATE TABLE "page_permissions" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "page_key" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_permissions_role_idx" ON "page_permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "page_permissions_role_page_key_key" ON "page_permissions"("role", "page_key");
