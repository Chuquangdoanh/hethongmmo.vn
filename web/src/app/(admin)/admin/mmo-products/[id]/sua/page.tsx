import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import MmoProductForm from "../../_components/MmoProductForm";

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
      isActive: true, isFeatured: true, displayOrder: true,
      requiresAccountType: true, requiresCccd: true,
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
          requiresAccountType: product.requiresAccountType,
          requiresCccd: product.requiresCccd,
        }}
      />
    </div>
  );
}
