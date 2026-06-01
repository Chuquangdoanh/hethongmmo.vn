-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SELLER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'TIKTOK', 'GOOGLE', 'INSTAGRAM', 'YOUTUBE', 'ICLOUD', 'ZALO', 'TELEGRAM', 'TWITTER', 'OTHER');

-- CreateEnum
CREATE TYPE "LearningFormat" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CourseBadge" AS ENUM ('NONE', 'HOT', 'POPULAR', 'TREND', 'NEW', 'VIP');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SERVICE', 'COURSE', 'TUTTRICK', 'MMO_PRODUCT', 'SELLER_PRODUCT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'CANCELLED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('DEPOSIT_AUTO', 'DEPOSIT_MANUAL', 'BUY_SERVICE', 'BUY_COURSE', 'BUY_TUTTRICK', 'BUY_MMO_PRODUCT', 'BUY_SELLER_PRODUCT', 'REFUND', 'SELLER_REGISTRATION', 'SELLER_PAYOUT', 'WITHDRAWAL_FEE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'LOGIN_2FA', 'RESET_PASSWORD', 'EMAIL_VERIFY', 'WITHDRAWAL_CONFIRM', 'SENSITIVE_ACTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEPOSIT', 'PURCHASE', 'ORDER_STATUS', 'SELLER_APPROVED', 'WITHDRAWAL_STATUS', 'SYSTEM', 'PROMOTION');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StockItemStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_deposited" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "seller_status" "SellerStatus" NOT NULL DEFAULT 'NONE',
    "seller_category" TEXT,
    "max_seller_products" INTEGER NOT NULL DEFAULT 3,
    "bank_name_enc" BYTEA,
    "bank_account_number_enc" BYTEA,
    "bank_account_holder_enc" BYTEA,
    "cccd_image_url" TEXT,
    "portrait_image_url" TEXT,
    "two_factor_secret_enc" BYTEA,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "uid_prefix" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_token" VARCHAR(128) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "family" VARCHAR(64) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "fail_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "platform" "Platform" NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "success_rate" INTEGER NOT NULL DEFAULT 100,
    "processing_time" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "warranty_options" JSONB NOT NULL DEFAULT '[]',
    "product_list" JSONB NOT NULL DEFAULT '[]',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "learning_format" "LearningFormat" NOT NULL,
    "original_price" DECIMAL(18,2) NOT NULL,
    "sale_price" DECIMAL(18,2) NOT NULL,
    "duration" TEXT,
    "student_count" INTEGER NOT NULL DEFAULT 0,
    "instructor_name" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "content_list" JSONB NOT NULL DEFAULT '[]',
    "platform_variants" JSONB NOT NULL DEFAULT '[]',
    "badge" "CourseBadge" NOT NULL DEFAULT 'NONE',
    "sale_deadline" DATE,
    "youtube_url" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tut_tricks" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "platform" "Platform" NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "content_url_enc" BYTEA,
    "docs" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "success_rate" INTEGER NOT NULL DEFAULT 100,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tut_tricks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mmo_products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL,
    "category_group" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mmo_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mmo_product_items" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "value_enc" BYTEA NOT NULL,
    "status" "StockItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sold_to_user_id" UUID,
    "order_id" UUID,
    "sold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mmo_product_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "service_id" UUID,
    "course_id" UUID,
    "tut_trick_id" UUID,
    "mmo_product_id" UUID,
    "seller_product_id" UUID,
    "seller_id" UUID,
    "item_name" TEXT NOT NULL,
    "original_price" DECIMAL(18,2) NOT NULL,
    "final_price" DECIMAL(18,2) NOT NULL,
    "warranty_variant" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'BALANCE',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "delivered_item_id" UUID,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "type" "TxType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "balance_before" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "reference_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 50000,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "approved_category" TEXT,
    "reject_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "seller_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_products" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "seller_category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "publish_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seller_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_product_stock" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "content_enc" BYTEA NOT NULL,
    "status" "StockItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sold_to_user_id" UUID,
    "order_id" UUID,
    "sold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_product_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_withdrawals" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee_percent" DOUBLE PRECISION NOT NULL,
    "fee_amount" DECIMAL(18,2) NOT NULL,
    "net_amount" DECIMAL(18,2) NOT NULL,
    "bank_name_enc" BYTEA NOT NULL,
    "bank_account_number_enc" BYTEA NOT NULL,
    "bank_account_holder_enc" BYTEA NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "qualifying_order_ids" JSONB NOT NULL DEFAULT '[]',
    "reject_reason" TEXT,
    "processed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "seller_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ticker_notifications" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticker_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticker_texts" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticker_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_registrations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "otp_code_hash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unmatched_transfers" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference_code" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "candidates_tried" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unmatched_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_type" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_uid_prefix_idx" ON "users"("uid_prefix");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_seller_status_idx" ON "users"("seller_status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_session_token_idx" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "login_attempts_email_created_at_idx" ON "login_attempts"("email", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_created_at_idx" ON "login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_slug_idx" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_platform_idx" ON "services"("platform");

-- CreateIndex
CREATE INDEX "services_is_active_is_featured_idx" ON "services"("is_active", "is_featured");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_slug_idx" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "courses_is_active_display_order_idx" ON "courses"("is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "tut_tricks_slug_key" ON "tut_tricks"("slug");

-- CreateIndex
CREATE INDEX "tut_tricks_slug_idx" ON "tut_tricks"("slug");

-- CreateIndex
CREATE INDEX "tut_tricks_platform_idx" ON "tut_tricks"("platform");

-- CreateIndex
CREATE INDEX "tut_tricks_is_active_is_featured_idx" ON "tut_tricks"("is_active", "is_featured");

-- CreateIndex
CREATE UNIQUE INDEX "mmo_products_slug_key" ON "mmo_products"("slug");

-- CreateIndex
CREATE INDEX "mmo_products_slug_idx" ON "mmo_products"("slug");

-- CreateIndex
CREATE INDEX "mmo_products_category_idx" ON "mmo_products"("category");

-- CreateIndex
CREATE INDEX "mmo_products_is_active_idx" ON "mmo_products"("is_active");

-- CreateIndex
CREATE INDEX "mmo_product_items_product_id_status_idx" ON "mmo_product_items"("product_id", "status");

-- CreateIndex
CREATE INDEX "mmo_product_items_order_id_idx" ON "mmo_product_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_order_type_idx" ON "orders"("order_type");

-- CreateIndex
CREATE INDEX "orders_seller_id_idx" ON "orders"("seller_id");

-- CreateIndex
CREATE INDEX "orders_order_code_idx" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_code_key" ON "transactions"("reference_code");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_reference_code_idx" ON "transactions"("reference_code");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "seller_requests_user_id_key" ON "seller_requests"("user_id");

-- CreateIndex
CREATE INDEX "seller_requests_status_idx" ON "seller_requests"("status");

-- CreateIndex
CREATE INDEX "seller_products_seller_id_idx" ON "seller_products"("seller_id");

-- CreateIndex
CREATE INDEX "seller_products_is_active_is_hidden_is_restricted_idx" ON "seller_products"("is_active", "is_hidden", "is_restricted");

-- CreateIndex
CREATE INDEX "seller_product_stock_product_id_status_idx" ON "seller_product_stock"("product_id", "status");

-- CreateIndex
CREATE INDEX "seller_withdrawals_seller_id_status_idx" ON "seller_withdrawals"("seller_id", "status");

-- CreateIndex
CREATE INDEX "seller_withdrawals_status_created_at_idx" ON "seller_withdrawals"("status", "created_at");

-- CreateIndex
CREATE INDEX "ticker_notifications_is_active_display_order_idx" ON "ticker_notifications"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "ticker_texts_is_active_display_order_idx" ON "ticker_texts"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "otp_codes_email_purpose_idx" ON "otp_codes"("email", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "pending_registrations_email_key" ON "pending_registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unmatched_transfers_reference_code_key" ON "unmatched_transfers"("reference_code");

-- CreateIndex
CREATE INDEX "unmatched_transfers_status_created_at_idx" ON "unmatched_transfers"("status", "created_at");

-- CreateIndex
CREATE INDEX "reviews_product_type_product_id_idx" ON "reviews"("product_type", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_product_type_product_id_key" ON "reviews"("user_id", "product_type", "product_id");

-- CreateIndex
CREATE INDEX "complaints_user_id_idx" ON "complaints"("user_id");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mmo_product_items" ADD CONSTRAINT "mmo_product_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "mmo_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tut_trick_id_fkey" FOREIGN KEY ("tut_trick_id") REFERENCES "tut_tricks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_mmo_product_id_fkey" FOREIGN KEY ("mmo_product_id") REFERENCES "mmo_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_product_id_fkey" FOREIGN KEY ("seller_product_id") REFERENCES "seller_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_requests" ADD CONSTRAINT "seller_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_product_stock" ADD CONSTRAINT "seller_product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "seller_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_withdrawals" ADD CONSTRAINT "seller_withdrawals_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
