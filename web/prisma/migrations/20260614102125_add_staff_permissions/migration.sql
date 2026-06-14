-- AlterTable
ALTER TABLE "seller_sub_categories" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "staff_permissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission" VARCHAR(64) NOT NULL,

    CONSTRAINT "staff_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_permissions_user_id_idx" ON "staff_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_permissions_user_id_permission_key" ON "staff_permissions"("user_id", "permission");

-- AddForeignKey
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
