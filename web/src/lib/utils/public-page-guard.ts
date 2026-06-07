import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export async function guardPublicPage(pageKey: string): Promise<void> {
  const config = await prisma.publicPageConfig.findUnique({
    where: { pageKey },
    select: { isVisible: true },
  });
  if (config?.isVisible === false) notFound();
}
