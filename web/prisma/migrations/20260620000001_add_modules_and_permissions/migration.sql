-- CreateTable: modules
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(255),
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: permissions
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "action" VARCHAR(64),
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- Migrate staff_permissions: drop old column, add permissionId FK
-- First, clear existing staff_permissions (dev env — permission strings won't map to new table)
DELETE FROM "staff_permissions";

-- Drop old unique constraint and column
ALTER TABLE "staff_permissions" DROP CONSTRAINT IF EXISTS "staff_permissions_user_id_permission_key";
ALTER TABLE "staff_permissions" DROP COLUMN IF EXISTS "permission";

-- Add new permissionId column and FK
ALTER TABLE "staff_permissions" ADD COLUMN "permission_id" UUID NOT NULL;
ALTER TABLE "staff_permissions" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new unique constraint
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_permission_id_key"
    UNIQUE ("user_id", "permission_id");

-- CreateIndex: modules
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");
CREATE INDEX "modules_code_idx" ON "modules"("code");
CREATE INDEX "modules_sort_order_idx" ON "modules"("sort_order");

-- CreateIndex: permissions
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");
CREATE INDEX "permissions_module_id_idx" ON "permissions"("module_id");
CREATE INDEX "permissions_code_idx" ON "permissions"("code");
CREATE INDEX "permissions_is_active_idx" ON "permissions"("is_active");

-- CreateIndex: staff_permissions
CREATE INDEX "staff_permissions_permission_id_idx" ON "staff_permissions"("permission_id");

-- AddForeignKey: permissions -> modules
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
