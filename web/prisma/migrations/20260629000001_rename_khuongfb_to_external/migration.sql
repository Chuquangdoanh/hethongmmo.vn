-- Migration: Rename khuongfb_products → external_products
-- Add provider column, rename table and order FK column

-- Step 1: Add provider column (idempotent)
ALTER TABLE khuongfb_products
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';

-- Step 2: Add indices for provider
CREATE INDEX IF NOT EXISTS "khuongfb_products_provider_idx"
  ON khuongfb_products(provider);

CREATE INDEX IF NOT EXISTS "khuongfb_products_provider_enabled_idx"
  ON khuongfb_products(provider, is_enabled);

-- Step 3: Rename column khuongfb_product_id → external_product_id in orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'khuongfb_product_id'
  ) THEN
    ALTER TABLE orders RENAME COLUMN khuongfb_product_id TO external_product_id;
  END IF;
END $$;

-- Step 4: Rename table khuongfb_products → external_products
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'khuongfb_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'external_products'
  ) THEN
    ALTER TABLE khuongfb_products RENAME TO external_products;
  END IF;
END $$;

-- Step 5: Rename FK constraint on orders (if still has old name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_khuongfb_product_id_fkey'
  ) THEN
    ALTER TABLE orders
      DROP CONSTRAINT orders_khuongfb_product_id_fkey;
    ALTER TABLE orders
      ADD CONSTRAINT "orders_external_product_id_fkey"
      FOREIGN KEY (external_product_id) REFERENCES external_products(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
