import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { PenLine, ChevronLeft, Boxes, AlertTriangle } from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import ProductForm from "../../_components/ProductForm";
import DeleteProductButton from "./DeleteProductButton";
import VariantManager from "@/components/shared/VariantManager";

export const metadata: Metadata = { title: "Chỉnh sửa sản phẩm" };

export default async function SuaSanPhamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [product, user] = await Promise.all([
    prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: {
        id: true, name: true, price: true, warrantyInfo: true, description: true,
        imageUrl: true, isActive: true, isHidden: true,
        isRestricted: true, sellerCategory: true, subCategoryId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        sellerCategory: true,
        subCategories: {
          select: { subCategory: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  if (!product) notFound();
  if (!user?.sellerCategory) redirect("/ban-hang");

  const subCategories = user.subCategories.map((r) => r.subCategory);

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="products" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Breadcrumb */}
          <Link
            href="/san-pham"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={14} /> Sản phẩm
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <PenLine size={17} className="text-violet-600" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/san-pham/${product.id}/kho`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                <Boxes size={13} /> Quản lý kho
              </Link>
              <DeleteProductButton productId={product.id} productName={product.name} />
            </div>
          </div>

          {/* Restricted warning */}
          {product.isRestricted && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Sản phẩm bị hạn chế</p>
                <p className="text-xs text-red-500 mt-0.5">Sản phẩm này đang bị admin hạn chế. Bạn không thể chỉnh sửa cho đến khi được mở khóa.</p>
              </div>
            </div>
          )}

          <ProductForm
            mode="edit"
            sellerCategory={user.sellerCategory}
            subCategories={subCategories}
            initialData={{
              id: product.id,
              name: product.name,
              price: Number(product.price),
              warrantyInfo: product.warrantyInfo ?? "",
              description: product.description ?? "",
              imageUrl: product.imageUrl ?? "",
              isActive: product.isActive,
              isHidden: product.isHidden,
              subCategoryId: product.subCategoryId ?? null,
            }}
          />

          {/* Biến thể sản phẩm — chỉ hiện khi sản phẩm không bị khóa */}
          {!product.isRestricted && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            
              <VariantManager productId={product.id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
