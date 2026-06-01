import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import TutTrickForm from "../../_components/TutTrickForm";

export const metadata: Metadata = { title: "Admin — Sửa Tut/Trick" };

export default async function AdminTutTrickEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.tutTrick.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, slug: true, platform: true, category: true,
      price: true, description: true, docs: true,
      successRate: true, rating: true, totalOrders: true, displayOrder: true,
      publishedDate: true, thumbnail: true,
      isActive: true, isFeatured: true,
      seoTitle: true, seoDescription: true,
      requiresAccountType: true, requiresCccd: true,
      // contentUrlEnc không trả về client — để trống = giữ link cũ
    },
  });

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tut-tricks" className="text-xs text-gray-500 hover:text-gray-700">← Tut &amp; Tricks</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sửa Tut/Trick</h1>
      <TutTrickForm
        initial={{
          id: item.id,
          name: item.name,
          slug: item.slug,
          platform: item.platform,
          category: item.category,
          price: Number(item.price),
          description: item.description ?? undefined,
          docs: item.docs ?? undefined,
          successRate: item.successRate,
          rating: item.rating,
          totalOrders: item.totalOrders,
          displayOrder: item.displayOrder,
          publishedDate: item.publishedDate ? item.publishedDate.toISOString() : null,
          thumbnail: item.thumbnail ?? undefined,
          isActive: item.isActive,
          isFeatured: item.isFeatured,
          seoTitle: item.seoTitle ?? undefined,
          seoDescription: item.seoDescription ?? undefined,
          requiresAccountType: item.requiresAccountType,
          requiresCccd: item.requiresCccd,
        }}
      />
    </div>
  );
}
