-- ============================================================
-- Migration: add_seller_tier_definitions
-- Converts User.seller_tier from PostgreSQL enum → VARCHAR(50)
-- and creates the seller_tier_definitions table for dynamic tiers.
-- ============================================================

-- 1. Create seller_tier_definitions table
CREATE TABLE "seller_tier_definitions" (
  "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
  "key"                VARCHAR(50)   NOT NULL,
  "label"              VARCHAR(30)   NOT NULL,
  "description"        VARCHAR(200),
  "badge_color"        VARCHAR(30)   NOT NULL DEFAULT 'gray',
  "fee_percent"        DOUBLE PRECISION NOT NULL DEFAULT 5,
  "min_withdrawal"     INTEGER       NOT NULL DEFAULT 200000,
  "hold_days"          INTEGER       NOT NULL DEFAULT 3,
  "benefits"           JSONB         NOT NULL DEFAULT '[]',
  "upgrade_min_revenue" INTEGER      NOT NULL DEFAULT 0,
  "upgrade_min_orders" INTEGER       NOT NULL DEFAULT 0,
  "display_order"      INTEGER       NOT NULL DEFAULT 0,
  "is_built_in"        BOOLEAN       NOT NULL DEFAULT false,
  "is_active"          BOOLEAN       NOT NULL DEFAULT true,
  "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_tier_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_tier_definitions_key_key"
  ON "seller_tier_definitions"("key");

CREATE INDEX "seller_tier_definitions_is_active_display_order_idx"
  ON "seller_tier_definitions"("is_active", "display_order");

-- 2. Remove the enum default first (enum default depends on enum type)
ALTER TABLE "users" ALTER COLUMN "seller_tier" DROP DEFAULT;

-- 3. Convert users.seller_tier from SellerTier enum → VARCHAR(50)
ALTER TABLE "users"
  ALTER COLUMN "seller_tier" TYPE VARCHAR(50) USING "seller_tier"::TEXT;

-- 4. Restore a plain-text default
ALTER TABLE "users" ALTER COLUMN "seller_tier" SET DEFAULT 'STANDARD';

-- 5. Drop the old enum type
DROP TYPE IF EXISTS "SellerTier";

-- 4. Seed the 4 built-in tiers
INSERT INTO "seller_tier_definitions"
  ("key", "label", "description", "badge_color", "fee_percent", "min_withdrawal",
   "hold_days", "benefits", "upgrade_min_revenue", "upgrade_min_orders",
   "display_order", "is_built_in", "is_active", "updated_at")
VALUES
  ('STANDARD', 'Standard', 'Hạng mặc định khi được duyệt', 'gray', 5, 200000, 3,
   '["Đăng bán sản phẩm trên marketplace","Hỗ trợ cơ bản qua chat"]',
   0, 0, 0, true, true, NOW()),
  ('SILVER', 'Silver', 'Seller hoạt động tích cực', 'slate', 4, 150000, 2,
   '["Phí rút tiền giảm còn 4%","Giữ đơn 2 ngày","Badge Silver"]',
   5000000, 20, 1, true, true, NOW()),
  ('GOLD', 'Gold', 'Seller có doanh thu tốt', 'amber', 3, 100000, 1,
   '["Phí rút tiền chỉ 3%","Rút tối thiểu 100.000đ","Badge Gold nổi bật"]',
   20000000, 100, 2, true, true, NOW()),
  ('VIP', 'VIP', 'Seller xuất sắc — ưu đãi cao nhất', 'violet', 1, 50000, 0,
   '["Phí rút tiền chỉ 1%","Không giữ đơn khi rút","Hỗ trợ ưu tiên 24/7","Badge VIP độc quyền"]',
   100000000, 500, 3, true, true, NOW());
