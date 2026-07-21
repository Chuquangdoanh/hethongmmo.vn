import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { getProviderConfigs } from "@/lib/external-providers/providers-config";
import VpsAdminClient from "./_components/VpsAdminClient";

export const metadata: Metadata = { title: "Admin — VPS (VNCloud)" };

export default async function AdminVpsPage() {
  const configs = await getProviderConfigs();
  const vncloudProvider = configs.find(c => (c.providerType ?? "khuongfb") === "vncloud") ?? null;

  const categories = await prisma.resourceCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true,
      subCategories: {
        where:   { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select:  { id: true, name: true, showInKhoTaiNguyen: true, showInTaiNguyenMmo: true },
      },
    },
  });

  return (
    <div className="p-6 w-full space-y-6">
      <VpsAdminClient
        providerId={vncloudProvider?.id ?? null}
        providerName={vncloudProvider?.name ?? null}
        categories={categories}
      />
    </div>
  );
}
