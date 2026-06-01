import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import AdminTickerClient from "./AdminTickerClient";

export const metadata: Metadata = { title: "Admin — Ticker" };

export default async function AdminTickersPage() {
  const texts = await prisma.tickerText.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quản lý Ticker</h1>
      <AdminTickerClient texts={texts} />
    </div>
  );
}
