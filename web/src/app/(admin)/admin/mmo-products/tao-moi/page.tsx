import type { Metadata } from "next";
import Link from "next/link";
import MmoProductForm from "../_components/MmoProductForm";

export const metadata: Metadata = { title: "Admin — Thêm tài nguyên MMO" };

export default function AdminMmoProductCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/mmo-products" className="text-xs text-gray-500 hover:text-gray-500">← MMO Products</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Thêm tài nguyên MMO mới</h1>
      <MmoProductForm />
    </div>
  );
}
