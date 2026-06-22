-- AddColumn: value_hash (nullable) to mmo_product_items
ALTER TABLE "mmo_product_items" ADD COLUMN "value_hash" TEXT;

-- CreateIndex: unique (product_id, value_hash) — PostgreSQL ignores NULLs in unique constraints,
-- so existing rows with NULL value_hash will not conflict.
CREATE UNIQUE INDEX "mmo_product_items_product_id_value_hash_key"
  ON "mmo_product_items"("product_id", "value_hash");
