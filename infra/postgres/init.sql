-- ====================================================================
-- EXTENSIONS & ROLES
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- App roles (least-privilege)
DO $$ BEGIN
  CREATE ROLE app_user WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE app_readonly WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- ENUMS
-- ====================================================================
DO $$ BEGIN CREATE TYPE role AS ENUM ('USER','SELLER','STAFF','ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE account_status AS ENUM ('ACTIVE','PENDING_VERIFICATION','BANNED','DELETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE seller_status AS ENUM ('NONE','PENDING','APPROVED','REJECTED','REVOKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE platform AS ENUM ('FACEBOOK','TIKTOK','GOOGLE','INSTAGRAM','YOUTUBE','ICLOUD','ZALO','TELEGRAM','TWITTER','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE learning_format AS ENUM ('ONLINE','OFFLINE','HYBRID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE course_badge AS ENUM ('NONE','HOT','POPULAR','TREND','NEW','VIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_type AS ENUM ('SERVICE','COURSE','TUTTRICK','MMO_PRODUCT','SELLER_PRODUCT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('PENDING','PROCESSING','DONE','CANCELLED','REFUNDED','DISPUTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tx_type AS ENUM (
  'DEPOSIT_AUTO','DEPOSIT_MANUAL',
  'BUY_SERVICE','BUY_COURSE','BUY_TUTTRICK','BUY_MMO_PRODUCT','BUY_SELLER_PRODUCT',
  'REFUND','SELLER_REGISTRATION','SELLER_PAYOUT','WITHDRAWAL_FEE','ADMIN_ADJUSTMENT'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE withdrawal_status AS ENUM ('PENDING','APPROVED','REJECTED','PROCESSING','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE otp_purpose AS ENUM ('REGISTER','LOGIN_2FA','RESET_PASSWORD','EMAIL_VERIFY','WITHDRAWAL_CONFIRM','SENSITIVE_ACTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('DEPOSIT','PURCHASE','ORDER_STATUS','SELLER_APPROVED','WITHDRAWAL_STATUS','SYSTEM','PROMOTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaint_status AS ENUM ('OPEN','IN_REVIEW','RESOLVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stock_item_status AS ENUM ('AVAILABLE','RESERVED','SOLD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- USERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    VARCHAR(255)   NOT NULL,
  email_verified_at        TIMESTAMPTZ,
  password_hash            TEXT           NOT NULL,
  full_name                VARCHAR(255)   NOT NULL,
  phone                    VARCHAR(20),
  role                     role           NOT NULL DEFAULT 'USER',
  status                   account_status NOT NULL DEFAULT 'PENDING_VERIFICATION',

  balance                  NUMERIC(18,2)  NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited          NUMERIC(18,2)  NOT NULL DEFAULT 0 CHECK (total_deposited >= 0),
  total_spent              NUMERIC(18,2)  NOT NULL DEFAULT 0 CHECK (total_spent >= 0),

  seller_status            seller_status  NOT NULL DEFAULT 'NONE',
  seller_category          VARCHAR(100),
  max_seller_products      INT            NOT NULL DEFAULT 3 CHECK (max_seller_products > 0),

  bank_name_enc            BYTEA,
  bank_account_number_enc  BYTEA,
  bank_account_holder_enc  BYTEA,
  cccd_image_url           TEXT,
  portrait_image_url       TEXT,

  two_factor_secret_enc    BYTEA,
  two_factor_enabled       BOOLEAN        NOT NULL DEFAULT FALSE,

  last_login_at            TIMESTAMPTZ,
  last_login_ip            VARCHAR(45),
  failed_login_count       INT            NOT NULL DEFAULT 0,
  locked_until             TIMESTAMPTZ,

  uid_prefix               VARCHAR(8)     NOT NULL,

  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email         ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_uid_prefix    ON users (uid_prefix);
CREATE INDEX IF NOT EXISTS idx_users_status        ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_seller_status ON users (seller_status);

-- Trigger: auto-fill uid_prefix từ 8 ký tự đầu UUID (bỏ dấu -)
CREATE OR REPLACE FUNCTION fn_set_uid_prefix() RETURNS TRIGGER AS $$
BEGIN
  NEW.uid_prefix := SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_uid_prefix ON users;
CREATE TRIGGER trg_users_uid_prefix
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_uid_prefix();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- SESSIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(128) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT sessions_token_unique UNIQUE (session_token)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ====================================================================
-- REFRESH_TOKENS
-- ====================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  family     VARCHAR(64)  NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family  ON refresh_tokens (family);

-- ====================================================================
-- LOGIN_ATTEMPTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         REFERENCES users(id),
  email       VARCHAR(255) NOT NULL,
  ip_address  VARCHAR(45)  NOT NULL,
  user_agent  TEXT,
  success     BOOLEAN      NOT NULL,
  fail_reason VARCHAR(100),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts (ip_address, created_at);

-- ====================================================================
-- SERVICES
-- ====================================================================
CREATE TABLE IF NOT EXISTS services (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             VARCHAR(255)  NOT NULL,
  name             VARCHAR(500)  NOT NULL,
  thumbnail        TEXT,
  platform         platform      NOT NULL,
  category         VARCHAR(100)  NOT NULL,
  price            NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  success_rate     INT           NOT NULL DEFAULT 100 CHECK (success_rate BETWEEN 0 AND 100),
  processing_time  VARCHAR(100),
  rating           FLOAT         NOT NULL DEFAULT 0,
  total_orders     INT           NOT NULL DEFAULT 0,
  total_views      INT           NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured      BOOLEAN       NOT NULL DEFAULT FALSE,
  description      TEXT,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  warranty_options JSONB         NOT NULL DEFAULT '[]',
  product_list     JSONB         NOT NULL DEFAULT '[]',
  display_order    INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT services_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_services_slug        ON services (slug);
CREATE INDEX IF NOT EXISTS idx_services_platform    ON services (platform);
CREATE INDEX IF NOT EXISTS idx_services_active      ON services (is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_services_category    ON services (category);

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- COURSES
-- ====================================================================
CREATE TABLE IF NOT EXISTS courses (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             VARCHAR(255)   NOT NULL,
  name             VARCHAR(500)   NOT NULL,
  thumbnail        TEXT,
  description      TEXT,
  category         VARCHAR(100)   NOT NULL,
  learning_format  learning_format NOT NULL,
  original_price   NUMERIC(18,2)  NOT NULL CHECK (original_price >= 0),
  sale_price       NUMERIC(18,2)  NOT NULL CHECK (sale_price >= 0),
  duration         VARCHAR(100),
  student_count    INT            NOT NULL DEFAULT 0,
  instructor_name  VARCHAR(255),
  rating           FLOAT          NOT NULL DEFAULT 0,
  content_list     JSONB          NOT NULL DEFAULT '[]',
  platform_variants JSONB         NOT NULL DEFAULT '[]',
  badge            course_badge   NOT NULL DEFAULT 'NONE',
  sale_deadline    DATE,
  youtube_url      TEXT,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  total_orders     INT            NOT NULL DEFAULT 0,
  total_views      INT            NOT NULL DEFAULT 0,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  display_order    INT            NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT courses_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_courses_slug     ON courses (slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_active   ON courses (is_active, display_order);

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- TUT_TRICKS
-- ====================================================================
CREATE TABLE IF NOT EXISTS tut_tricks (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(255)  NOT NULL,
  name            VARCHAR(500)  NOT NULL,
  thumbnail       TEXT,
  platform        platform      NOT NULL,
  category        VARCHAR(100)  NOT NULL,
  price           NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description     TEXT,
  content_url_enc BYTEA,
  docs            TEXT,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN       NOT NULL DEFAULT FALSE,
  total_orders    INT           NOT NULL DEFAULT 0,
  total_views     INT           NOT NULL DEFAULT 0,
  success_rate    INT           NOT NULL DEFAULT 100,
  rating          FLOAT         NOT NULL DEFAULT 0,
  display_order   INT           NOT NULL DEFAULT 0,
  published_date  DATE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT tut_tricks_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_tut_tricks_slug     ON tut_tricks (slug);
CREATE INDEX IF NOT EXISTS idx_tut_tricks_platform ON tut_tricks (platform);
CREATE INDEX IF NOT EXISTS idx_tut_tricks_active   ON tut_tricks (is_active, is_featured);

DROP TRIGGER IF EXISTS trg_tut_tricks_updated_at ON tut_tricks;
CREATE TRIGGER trg_tut_tricks_updated_at BEFORE UPDATE ON tut_tricks FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- MMO_PRODUCTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS mmo_products (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(255)  NOT NULL,
  name           VARCHAR(500)  NOT NULL,
  thumbnail      TEXT,
  category       VARCHAR(100)  NOT NULL,
  category_group VARCHAR(100)  NOT NULL,
  price          NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  description    TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN       NOT NULL DEFAULT FALSE,
  display_order  INT           NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT mmo_products_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_mmo_products_slug     ON mmo_products (slug);
CREATE INDEX IF NOT EXISTS idx_mmo_products_category ON mmo_products (category);
CREATE INDEX IF NOT EXISTS idx_mmo_products_active   ON mmo_products (is_active);

DROP TRIGGER IF EXISTS trg_mmo_products_updated_at ON mmo_products;
CREATE TRIGGER trg_mmo_products_updated_at BEFORE UPDATE ON mmo_products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- MMO_PRODUCT_ITEMS
-- ====================================================================
CREATE TABLE IF NOT EXISTS mmo_product_items (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid              NOT NULL REFERENCES mmo_products(id) ON DELETE CASCADE,
  value_enc        BYTEA             NOT NULL,
  status           stock_item_status NOT NULL DEFAULT 'AVAILABLE',
  sold_to_user_id  uuid,
  order_id         uuid,
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mmo_items_product_status ON mmo_product_items (product_id, status);
CREATE INDEX IF NOT EXISTS idx_mmo_items_order          ON mmo_product_items (order_id);

-- VIEW: stock/sold count (không lưu cứng — chống thao túng)
CREATE OR REPLACE VIEW v_mmo_product_stock AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS stock_count,
  COUNT(*) FILTER (WHERE status = 'SOLD')      AS sold_count
FROM mmo_product_items
GROUP BY product_id;

-- ====================================================================
-- SELLER_PRODUCTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS seller_products (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_category VARCHAR(100)  NOT NULL,
  name            VARCHAR(500)  NOT NULL,
  price           NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  description     TEXT,
  image_url       TEXT,
  publish_date    TIMESTAMPTZ,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  is_hidden       BOOLEAN       NOT NULL DEFAULT FALSE,
  is_restricted   BOOLEAN       NOT NULL DEFAULT FALSE,
  sales_count     INT           NOT NULL DEFAULT 0,
  revenue         NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_seller_products_seller ON seller_products (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_active ON seller_products (is_active, is_hidden, is_restricted);

DROP TRIGGER IF EXISTS trg_seller_products_updated_at ON seller_products;
CREATE TRIGGER trg_seller_products_updated_at BEFORE UPDATE ON seller_products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- SELLER_PRODUCT_STOCK
-- ====================================================================
CREATE TABLE IF NOT EXISTS seller_product_stock (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid              NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  content_enc      BYTEA             NOT NULL,
  status           stock_item_status NOT NULL DEFAULT 'AVAILABLE',
  sold_to_user_id  uuid,
  order_id         uuid,
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_stock_product_status ON seller_product_stock (product_id, status);

-- VIEW: quantity cho seller products
CREATE OR REPLACE VIEW v_seller_product_stock AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS stock_count,
  COUNT(*) FILTER (WHERE status = 'SOLD')      AS sold_count
FROM seller_product_stock
GROUP BY product_id;

-- ====================================================================
-- ORDERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code        VARCHAR(50)   NOT NULL,
  user_id           uuid          NOT NULL REFERENCES users(id),
  order_type        order_type    NOT NULL,
  service_id        uuid          REFERENCES services(id),
  course_id         uuid          REFERENCES courses(id),
  tut_trick_id      uuid          REFERENCES tut_tricks(id),
  mmo_product_id    uuid          REFERENCES mmo_products(id),
  seller_product_id uuid          REFERENCES seller_products(id),
  seller_id         uuid,
  item_name         VARCHAR(500)  NOT NULL,
  original_price    NUMERIC(18,2) NOT NULL CHECK (original_price >= 0),
  final_price       NUMERIC(18,2) NOT NULL CHECK (final_price >= 0),
  warranty_variant  VARCHAR(255),
  payment_method    VARCHAR(50)   NOT NULL DEFAULT 'BALANCE',
  status            order_status  NOT NULL DEFAULT 'PENDING',
  delivered_item_id uuid,
  idempotency_key   VARCHAR(255),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  CONSTRAINT orders_code_unique       UNIQUE (order_code),
  CONSTRAINT orders_idempotency_unique UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_type       ON orders (order_type);
CREATE INDEX IF NOT EXISTS idx_orders_seller     ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_code       ON orders (order_code);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ====================================================================
-- TRANSACTIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          NOT NULL REFERENCES users(id),
  order_id       uuid          REFERENCES orders(id),
  type           tx_type       NOT NULL,
  amount         NUMERIC(18,2) NOT NULL,
  description    TEXT          NOT NULL,
  balance_before NUMERIC(18,2) NOT NULL,
  balance_after  NUMERIC(18,2) NOT NULL,
  reference_code VARCHAR(255),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT transactions_ref_unique UNIQUE (reference_code)
);
CREATE INDEX IF NOT EXISTS idx_tx_user     ON transactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_type     ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_tx_ref_code ON transactions (reference_code);

-- ====================================================================
-- NOTIFICATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(500)      NOT NULL,
  body       TEXT              NOT NULL,
  type       notification_type NOT NULL DEFAULT 'SYSTEM',
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  meta       JSONB,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);

-- ====================================================================
-- SELLER_REQUESTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS seller_requests (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category           VARCHAR(100)  NOT NULL,
  fee                NUMERIC(18,2) NOT NULL DEFAULT 50000,
  status             seller_status NOT NULL DEFAULT 'PENDING',
  approved_category  VARCHAR(100),
  reject_reason      TEXT,
  reviewed_by_user_id uuid,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  approved_at        TIMESTAMPTZ,
  rejected_at        TIMESTAMPTZ,
  CONSTRAINT seller_requests_user_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_seller_requests_status ON seller_requests (status);

-- ====================================================================
-- SELLER_WITHDRAWALS
-- ====================================================================
CREATE TABLE IF NOT EXISTS seller_withdrawals (
  id                     uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id              uuid              NOT NULL REFERENCES users(id),
  amount                 NUMERIC(18,2)     NOT NULL CHECK (amount > 0),
  fee_percent            FLOAT             NOT NULL,
  fee_amount             NUMERIC(18,2)     NOT NULL CHECK (fee_amount >= 0),
  net_amount             NUMERIC(18,2)     NOT NULL CHECK (net_amount >= 0),
  bank_name_enc          BYTEA             NOT NULL,
  bank_account_number_enc BYTEA            NOT NULL,
  bank_account_holder_enc BYTEA            NOT NULL,
  status                 withdrawal_status NOT NULL DEFAULT 'PENDING',
  qualifying_order_ids   JSONB             NOT NULL DEFAULT '[]',
  reject_reason          TEXT,
  processed_by_user_id   uuid,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT now(),
  processed_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_seller ON seller_withdrawals (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON seller_withdrawals (status, created_at);

-- ====================================================================
-- SYSTEM_CONFIG
-- ====================================================================
CREATE TABLE IF NOT EXISTS system_config (
  key               VARCHAR(100)  PRIMARY KEY,
  value             JSONB         NOT NULL,
  description       TEXT,
  updated_by_user_id uuid,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ====================================================================
-- TICKER_NOTIFICATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS ticker_notifications (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20)   NOT NULL,
  amount       NUMERIC(18,2) NOT NULL,
  display_order INT          NOT NULL DEFAULT 0,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticker_notif_active ON ticker_notifications (is_active, display_order);

-- ====================================================================
-- TICKER_TEXTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS ticker_texts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  text         TEXT        NOT NULL,
  display_order INT        NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticker_texts_active ON ticker_texts (is_active, display_order);

-- ====================================================================
-- OTP_CODES
-- ====================================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  user_id     uuid,
  purpose     otp_purpose NOT NULL,
  code_hash   TEXT        NOT NULL,
  attempts    INT         NOT NULL DEFAULT 0,
  max_attempts INT        NOT NULL DEFAULT 5,
  ip_address  VARCHAR(45),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_codes (email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires        ON otp_codes (expires_at);

-- ====================================================================
-- PENDING_REGISTRATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS pending_registrations (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL,
  full_name    VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  otp_code_hash TEXT        NOT NULL,
  attempts     INT          NOT NULL DEFAULT 0,
  ip_address   VARCHAR(45),
  expires_at   TIMESTAMPTZ  NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pending_reg_email_unique UNIQUE (email)
);

-- ====================================================================
-- UNMATCHED_TRANSFERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS unmatched_transfers (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  content             TEXT          NOT NULL,
  amount              NUMERIC(18,2) NOT NULL,
  reference_code      VARCHAR(255)  NOT NULL,
  raw_payload         JSONB         NOT NULL,
  candidates_tried    JSONB         NOT NULL DEFAULT '[]',
  status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  resolved_by_user_id uuid,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT unmatched_ref_unique UNIQUE (reference_code)
);
CREATE INDEX IF NOT EXISTS idx_unmatched_status ON unmatched_transfers (status, created_at);

-- ====================================================================
-- REVIEWS
-- ====================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id),
  product_type VARCHAR(20) NOT NULL,
  product_id   uuid        NOT NULL,
  rating       INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_type, product_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_type, product_id);

-- ====================================================================
-- COMPLAINTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS complaints (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid             NOT NULL REFERENCES users(id),
  order_id            uuid,
  subject             VARCHAR(500)     NOT NULL,
  content             TEXT             NOT NULL,
  status              complaint_status NOT NULL DEFAULT 'OPEN',
  resolution          TEXT,
  resolved_by_user_id uuid,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_complaints_user   ON complaints (user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);

-- ====================================================================
-- AUDIT_LOGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   TEXT,
  before      JSONB,
  after       JSONB,
  metadata    JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs (actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs (target_type, target_id);

-- ====================================================================
-- ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_product_stock ENABLE ROW LEVEL SECURITY;

-- app_user chỉ thấy dữ liệu của chính mình (application enforces via session)
-- Policy ví dụ — app dùng SET app.current_user_id để RLS tự filter
CREATE POLICY users_self_only ON users
  USING (id = current_setting('app.current_user_id', TRUE)::uuid OR
         current_setting('app.role', TRUE) IN ('ADMIN', 'STAFF'));

-- ====================================================================
-- GRANT PERMISSIONS
-- ====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- ====================================================================
-- SEED: system_config defaults
-- ====================================================================
INSERT INTO system_config (key, value, description) VALUES
  ('seller_settings', '{
    "registration_fee": 50000,
    "withdrawal_fee_percent": 5,
    "min_withdrawal_amount": 200000,
    "max_seller_products": 3,
    "allowed_categories": ["Facebook","TikTok","YouTube","Instagram","Telegram","Zalo"]
  }', 'Cài đặt tính năng seller')
ON CONFLICT (key) DO NOTHING;
