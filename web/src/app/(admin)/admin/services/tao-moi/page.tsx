import type { Metadata } from "next";
import Link from "next/link";
import ServiceForm from "../_components/ServiceForm";

export const metadata: Metadata = { title: "Admin — Thêm dịch vụ" };

export default function AdminServiceCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/services" className="text-xs text-gray-500 hover:text-gray-500">← Dịch vụ</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Thêm dịch vụ mới</h1>
      <ServiceForm />
    </div>
  );
}
