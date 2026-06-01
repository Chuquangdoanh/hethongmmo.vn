import type { Metadata } from "next";
import Link from "next/link";
import CourseForm from "../_components/CourseForm";

export const metadata: Metadata = { title: "Admin — Thêm khóa học" };

export default function AdminCourseCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/courses" className="text-xs text-gray-500 hover:text-gray-500">← Khóa học</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Thêm khóa học mới</h1>
      <CourseForm />
    </div>
  );
}
