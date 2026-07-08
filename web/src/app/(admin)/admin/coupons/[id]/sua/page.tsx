import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import CouponForm from "../../_components/CouponForm";

export const metadata: Metadata = { title: "Admin — Sửa mã giảm giá" };

async function resolveProductInfo(
  productType: string,
  productId: string,
): Promise<{ productName?: string; sellerName?: string }> {
  if (productType === "SELLER_PRODUCT") {
    const row = await prisma.sellerProduct.findUnique({
      where: { id: productId },
      select: { name: true, seller: { select: { fullName: true } } },
    });
    return { productName: row?.name, sellerName: row?.seller.fullName };
  }
  if (productType === "MMO_PRODUCT") {
    const row = await prisma.mmoProduct.findUnique({ where: { id: productId }, select: { name: true } });
    return { productName: row?.name };
  }
  const row = await prisma.externalProduct.findUnique({ where: { id: productId }, select: { name: true } });
  return { productName: row?.name };
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;
  if (!me || me.role !== "ADMIN") redirect("/admin/dashboard");

  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: { products: true },
  });
  if (!coupon || coupon.deletedAt) notFound();

  const productsWithNames = await Promise.all(
    coupon.products.map(async (p) => ({
      productType: p.productType,
      productId: p.productId,
      ...(await resolveProductInfo(p.productType, p.productId)),
    })),
  );

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Sửa mã giảm giá — {coupon.code}</h1>
      <CouponForm
        initial={{
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          maxUses: coupon.maxUses,
          minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
          minTierLabel: coupon.minTierLabel,
          newUserOnly: coupon.newUserOnly,
          startAt: coupon.startAt.toISOString(),
          endAt: coupon.endAt.toISOString(),
          isActive: coupon.isActive,
          products: productsWithNames,
        }}
      />
    </div>
  );
}
