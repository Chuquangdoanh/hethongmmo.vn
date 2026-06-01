import type { Metadata } from "next";
import Link from "next/link";
import TutTrickForm from "../_components/TutTrickForm";

export const metadata: Metadata = { title: "Admin — Thêm Tut/Trick" };

export default function AdminTutTrickCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tut-tricks" className="text-xs text-gray-500 hover:text-gray-500">← Tut &amp; Tricks</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Thêm Tut/Trick mới</h1>
      <TutTrickForm />
    </div>
  );
}
