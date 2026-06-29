-- Migration: khuongfb_products → external_products
-- Each step is a separate idempotent DO block — simple, debuggable.

-- Step 1: Add provider column to khuongfb_products if table still has old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'khuongfb_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'khuongfb_products' AND column_name = 'provider'
  ) THEN
    ALTER TABLE khuongfb_products
      ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';
  END IF;
END $$;

-- Step 2: Rename table khuongfb_products → external_products (if not yet renamed)
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

-- Step 3: Add provider column to external_products if missing
--         (handles case where table was manually renamed without adding provider)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'external_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_products' AND column_name = 'provider'
  ) THEN
    ALTER TABLE external_products
      ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';
  END IF;
END $$;

-- Step 4: Create provider index (idempotent via IF NOT EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'external_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'external_products'
      AND indexname IN (
        'khuongfb_products_provider_idx',
        'external_products_provider_idx',
        'idx_khuongfb_products_provider'
      )
  ) THEN
    CREATE INDEX khuongfb_products_provider_idx ON external_products(provider);
  END IF;
END $$;

-- Step 5: Create provider + is_enabled composite index (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'external_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'external_products'
      AND indexname IN (
        'khuongfb_products_provider_is_enabled_idx',
        'external_products_provider_is_enabled_idx',
        'idx_khuongfb_products_provider_ext_id'
      )
  ) THEN
    CREATE INDEX khuongfb_products_provider_is_enabled_idx
      ON external_products(provider, is_enabled);
  END IF;
END $$;

-- Step 6: Rename column khuongfb_product_id → external_product_id in orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'khuongfb_product_id'
  ) THEN
    ALTER TABLE orders RENAME COLUMN khuongfb_product_id TO external_product_id;
  END IF;
END $$;

-- Step 7: Rename FK constraint (drop old, add new pointing to renamed column + table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_khuongfb_product_id_fkey'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_khuongfb_product_id_fkey;
    ALTER TABLE orders
      ADD CONSTRAINT orders_external_product_id_fkey
      FOREIGN KEY (external_product_id) REFERENCES external_products(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
