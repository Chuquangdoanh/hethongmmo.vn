import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ServiceForm from "../../_components/ServiceForm";

export const metadata: Metadata = { title: "Admin — Sửa dịch vụ" };

interface PlatformVariant {
  name: string;
  icon: string;
}

interface WarrantyOption {
  name: string;
  price: number;
}

interface DeviceVariant {
  name: string;
  price: number;
}

function parsePlatformVariants(raw: unknown): PlatformVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), icon: String(obj.icon ?? "") }];
    }
    return [];
  });
}

function parseWarrantyOptions(raw: unknown): WarrantyOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), price: Number(obj.price ?? 0) }];
    }
    return [];
  });
}

function parseDeviceVariants(raw: unknown): DeviceVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), price: Number(obj.price ?? 0) }];
    }
    return [];
  });
}

export default async function AdminServiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, slug: true, platform: true, category: true,
      price: true, thumbnail: true, successRate: true, processingTime: true,
      description: true, isActive: true, isFeatured: true, displayOrder: true,
      customerCount: true, totalViews: true, totalOrders: true, reviewCount: true,
      rating: true, warrantyOptions: true, platformVariants: true, productList: true,
      seoTitle: true, seoDescription: true,
      requiresAccountType: true, requiresCccd: true,
    },
  });

  if (!service) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/services" className="text-xs text-gray-500 hover:text-gray-500">← Dịch vụ</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Sửa dịch vụ</h1>
      <ServiceForm
        initial={{
          id: service.id,
          name: service.name,
          slug: service.slug,
          platform: service.platform,
          category: service.category,
          price: Number(service.price),
          thumbnail: service.thumbnail ?? undefined,
          successRate: service.successRate,
          processingTime: service.processingTime ?? undefined,
          description: service.description ?? undefined,
          isActive: service.isActive,
          isFeatured: service.isFeatured,
          displayOrder: service.displayOrder,
          customerCount: service.customerCount,
          totalViews: service.totalViews,
          totalOrders: service.totalOrders,
          reviewCount: service.reviewCount,
          rating: service.rating,
          warrantyOptions: parseWarrantyOptions(service.warrantyOptions),
          platformVariants: parsePlatformVariants(service.platformVariants),
          deviceVariants: parseDeviceVariants(service.productList),
          seoTitle: service.seoTitle ?? undefined,
          seoDescription: service.seoDescription ?? undefined,
          requiresAccountType: service.requiresAccountType,
          requiresCccd: service.requiresCccd,
        }}
      />
    </div>
  );
}
