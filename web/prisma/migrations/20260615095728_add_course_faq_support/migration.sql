-- CreateTable
CREATE TABLE "course_faq_categories" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_faqs" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "category_id" UUID,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_support_items" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✅',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_support_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_faq_categories_course_id_display_order_idx" ON "course_faq_categories"("course_id", "display_order");

-- CreateIndex
CREATE INDEX "course_faqs_course_id_display_order_idx" ON "course_faqs"("course_id", "display_order");

-- CreateIndex
CREATE INDEX "course_support_items_course_id_display_order_idx" ON "course_support_items"("course_id", "display_order");

-- AddForeignKey
ALTER TABLE "course_faq_categories" ADD CONSTRAINT "course_faq_categories_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_faqs" ADD CONSTRAINT "course_faqs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_faqs" ADD CONSTRAINT "course_faqs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "course_faq_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_support_items" ADD CONSTRAINT "course_support_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
