-- CreateEnum
CREATE TYPE "TestimonialType" AS ENUM ('COURSE', 'SERVICE');

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL,
    "type" "TestimonialType" NOT NULL,
    "course_id" UUID,
    "category" TEXT,
    "reviewer_name" TEXT NOT NULL,
    "reviewer_role" TEXT,
    "reviewer_avatar" TEXT,
    "reviewer_initials" TEXT,
    "reviewer_color" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonials_type_is_active_display_order_idx" ON "testimonials"("type", "is_active", "display_order");

-- CreateIndex
CREATE INDEX "testimonials_course_id_is_active_idx" ON "testimonials"("course_id", "is_active");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
