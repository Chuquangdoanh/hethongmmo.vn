import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import SellerProfileHero from "@/components/shared/SellerProfileHero";
import SubCategoryEditForm from "./_components/SubCategoryEditForm";

export const metadata: Metadata = { title: "Danh mục con của tôi" };

export default async function SellerSubCategoryPage() {
  const session = await auth();
  const me = requireSeller(session);

  // Get seller's registered category and their current sub-categories
  const seller = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      sellerCategory: true,
      subCategories: {
        select: { subCategoryId: true },
      },
    },
  });

  if (!seller) notFound();

  const currentIds = seller.subCategories.map((r) => r.subCategoryId);

  // Load all available sub-categories grouped by category
  // For approved seller: show sub-categories for their approved category
  const approvedCategory = seller.sellerCategory;

  const resourceCategories = await prisma.resourceCategory.findMany({
    where: approvedCategory ? { name: approvedCategory } : undefined,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      subCategories: {
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });

  const groups = resourceCategories
    .filter((c) => c.subCategories.length > 0)
    .map((c) => ({ categoryName: c.name, subCategories: c.subCategories }));

  return (
    <>
      <SellerProfileHero userId={me.id} activeTab="danh-muc" />
      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Danh mục con của tôi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Chọn danh mục con bạn muốn bán để người mua có thể tìm thấy sản phẩm dễ hơn.
            </p>
            {approvedCategory && (
              <p className="text-xs text-gray-400 mt-0.5">
                Danh mục chính: <span className="font-medium text-gray-600">{approvedCategory}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SubCategoryEditForm groups={groups} currentIds={currentIds} />
          </div>
        </div>
      </div>
    </>
  );
}
