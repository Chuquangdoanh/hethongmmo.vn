import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import MmoProductForm from "../../_components/MmoProductForm";
import VariantManager from "@/components/shared/VariantManager";

export const metadata: Metadata = { title: "Admin — Sửa tài nguyên MMO" };

export default async function AdminMmoProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.mmoProduct.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, slug: true, category: true, categoryGroup: true,
      price: true, description: true, thumbnail: true,
      isActive: true, isFeatured: true, displayOrder: true, section: true,
    },
  });

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/mmo-products" className="text-xs text-gray-500 hover:text-gray-500">← MMO Products</Link>
        <span className="text-[#2A2A38]">/</span>
        <Link href={`/admin/mmo-products/${id}/stock`} className="text-xs text-gray-500 hover:text-gray-500">Quản lý kho</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sửa tài nguyên MMO</h1>
      <MmoProductForm
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category,
          categoryGroup: product.categoryGroup,
          price: Number(product.price),
          description: product.description ?? undefined,
          thumbnail: product.thumbnail ?? undefined,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          displayOrder: product.displayOrder,
          section: product.section,
        }}
      />

      {/* Step guide */}
      <div className="flex items-center gap-0 rounded-xl border border-gray-200 bg-white overflow-hidden text-xs">
        {[
          { n: "1", label: "Thông tin cơ bản", done: true, active: false },
          { n: "2", label: "Biến thể & Giá", done: false, active: true },
          { n: "3", label: "Nhập kho", done: false, active: false },
        ].map((step, i, arr) => (
          <div key={step.n} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-medium border-r last:border-r-0 border-gray-200 ${step.done ? "text-emerald-600 bg-emerald-50/60" : step.active ? "bg-[#7C3AED]/8 text-[#7C3AED]" : "text-gray-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.done ? "bg-emerald-500 text-white" : step.active ? "bg-[#7C3AED] text-white" : "bg-gray-200 text-gray-400"}`}>{step.done ? "✓" : step.n}</span>
            {step.label}
            {i < arr.length - 1 && <span className="ml-1 text-gray-300 hidden sm:inline">→</span>}
          </div>
        ))}
      </div>

      {/* Gói biến thể — Bảo hành & Giá */}
      <div id="variants-section" className="rounded-xl border border-[#7C3AED]/30 bg-[#faf8ff] p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Gói biến thể (Bảo hành &amp; Giá) — Bước 2</h2>
        <VariantManager productId={product.id} isAdmin apiBase="/api/products/mmo" />
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xs text-gray-500">Sau khi thêm đủ gói, tiếp tục nhập kho bên dưới.</p>
          <a href={`/admin/mmo-products/${product.id}/stock`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#A855F7] transition-colors">
            Bước 3: Nhập kho →
          </a>
        </div>
      </div>
    </div>
  );
}
