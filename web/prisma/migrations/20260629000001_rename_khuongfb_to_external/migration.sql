-- Migration: Rename khuongfb_products → external_products + add provider column
-- Fully idempotent — handles all possible DB states:
--   State A: khuongfb_products exists, no provider column (migration 64 applied, no manual rename)
--   State B: external_products exists (manual SQL already run on VPS)
--   State C: khuongfb_products exists WITH provider column (manual SQL partially applied)

DO $$
DECLARE
  v_has_kfb      BOOLEAN;
  v_has_ext      BOOLEAN;
BEGIN
  v_has_kfb := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'khuongfb_products'
  );
  v_has_ext := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'external_products'
  );

  -- ── khuongfb_products exists and NOT yet renamed ──────────────────────────
  IF v_has_kfb AND NOT v_has_ext THEN

    -- Add provider column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'khuongfb_products' AND column_name = 'provider'
    ) THEN
      ALTER TABLE khuongfb_products
        ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';
    END IF;

    -- Add provider indices (on old name before rename)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'khuongfb_products' AND indexname = 'khuongfb_products_provider_idx'
    ) THEN
      CREATE INDEX khuongfb_products_provider_idx ON khuongfb_products(provider);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'khuongfb_products' AND indexname = 'khuongfb_products_provider_is_enabled_idx'
    ) THEN
      CREATE INDEX khuongfb_products_provider_is_enabled_idx ON khuongfb_products(provider, is_enabled);
    END IF;

    -- Rename table
    ALTER TABLE khuongfb_products RENAME TO external_products;

  -- ── external_products already exists (manual rename already done) ─────────
  ELSIF v_has_ext THEN

    -- Ensure provider column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'external_products' AND column_name = 'provider'
    ) THEN
      ALTER TABLE external_products
        ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';
    END IF;

    -- Ensure provider indices exist (may or may not exist depending on which manual SQL was run)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'external_products'
        AND indexname IN ('khuongfb_products_provider_idx', 'external_products_provider_idx', 'idx_khuongfb_products_provider')
    ) THEN
      CREATE INDEX khuongfb_products_provider_idx ON external_products(provider);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'external_products'
        AND indexname IN ('khuongfb_products_provider_is_enabled_idx', 'external_products_provider_is_enabled_idx', 'idx_khuongfb_products_provider_ext_id')
    ) THEN
      CREATE INDEX khuongfb_products_provider_is_enabled_idx ON external_products(provider, is_enabled);
    END IF;

  END IF;
END $$;

-- Rename column khuongfb_product_id → external_product_id in orders (if still old name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'khuongfb_product_id'
  ) THEN
    ALTER TABLE orders RENAME COLUMN khuongfb_product_id TO external_product_id;
  END IF;
END $$;

-- Rename FK constraint on orders (if still has old name)
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
