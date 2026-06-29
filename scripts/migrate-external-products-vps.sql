-- ============================================================
-- Migration: khuongfb_products → external_products
-- Chạy 1 lần trên VPS để sync DB với schema Prisma hiện tại
-- ============================================================

-- Bước 1: Thêm cột provider (nếu chưa có)
ALTER TABLE khuongfb_products
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'khuongfb';

-- Bước 2: Index cho provider
CREATE INDEX IF NOT EXISTS idx_khuongfb_products_provider
  ON khuongfb_products(provider);

CREATE INDEX IF NOT EXISTS idx_khuongfb_products_provider_ext_id
  ON khuongfb_products(provider, external_id);

-- Bước 3: Đổi tên cột trên bảng orders
--   (bỏ qua nếu cột external_product_id đã tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'khuongfb_product_id'
  ) THEN
    ALTER TABLE orders RENAME COLUMN khuongfb_product_id TO external_product_id;
  END IF;
END $$;

-- Bước 4: Đổi tên bảng chính
--   (bỏ qua nếu external_products đã tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'khuongfb_products'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'external_products'
  ) THEN
    ALTER TABLE khuongfb_products RENAME TO external_products;
  END IF;
END $$;

-- Kiểm tra kết quả
SELECT
  (SELECT COUNT(*) FROM external_products)              AS total_external_products,
  (SELECT COUNT(DISTINCT provider) FROM external_products) AS provider_count,
  (SELECT COUNT(*) FROM orders WHERE external_product_id IS NOT NULL) AS orders_with_ext_product;
