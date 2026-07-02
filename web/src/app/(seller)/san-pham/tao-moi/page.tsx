import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { PackagePlus, ChevronLeft, AlertTriangle } from "lucide-react";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import ProductForm from "../_components/ProductForm";

export const metadata: Metadata = { title: "Thêm sản phẩm" };

export default async function TaoMoiSanPhamPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [user, allSubCats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        sellerCategory: true,
        maxSellerProducts: true,
        _count: { select: { sellerProducts: { where: { deletedAt: null } } } },
        subCategories: {
          select: { subCategory: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.sellerSubCategory.findMany({
      where: { isActive: true, users: { some: { userId: me.id } } },
      select: {
        id: true,
        name: true,
        categoryName: true,
        showInKhoTaiNguyen: true,
        showInTaiNguyenMmo: true,
      },
      orderBy: [{ categoryName: "asc" }, { displayOrder: "asc" }],
    }),
  ]);

  if (!user?.sellerCategory) redirect("/ban-hang");

  const canAdd = (user._count.sellerProducts ?? 0) < (user.maxSellerProducts ?? 3);
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <PackagePlus size={17} className="text-gray-500" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
          </div>

          {!canAdd ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">Đã đạt giới hạn sản phẩm</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Bạn đã tạo tối đa {user.maxSellerProducts} sản phẩm. Liên hệ admin để nâng giới hạn.
                </p>
              </div>
            </div>
          ) : (
            <ProductForm
              mode="create"
              sellerCategory={user.sellerCategory}
              subCategories={subCategories}
              allSubCats={allSubCats}
            />
          )}
        </div>
      </div>
    </>
  );
}
