import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import Pagination from "@/components/shared/Pagination";
import TutTricksTable from "./_components/TutTricksTable";
import { r2Url } from "@/lib/utils/image-url";

export const metadata: Metadata = { title: "Admin — Tut & Tricks" };

const PAGE_SIZE = 20;


function buildUrl(base: string, params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return `${base}${s ? `?${s}` : ""}`;
}

export default async function AdminTutTricksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tier?: string; q?: string }>;
}) {
  const { page, category, tier, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(tier ? { tier } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as never } } : {}),
  };

  const [items, total, allTotal, activeCount, freeCount, dbCategories] = await Promise.all([
    prisma.tutTrick.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, thumbnail: true, platform: true, category: true,
        tier: true, price: true, isActive: true, isFeatured: true, rating: true,
      },
    }),
    prisma.tutTrick.count({ where }),
    prisma.tutTrick.count({ where: { deletedAt: null } }),
    prisma.tutTrick.count({ where: { deletedAt: null, isActive: true } }),
    prisma.tutTrick.count({ where: { deletedAt: null, tier: "Miễn phí" } }),
    prisma.tutTrickCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { name: true, iconUrl: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const BASE = "/admin/tut-tricks";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tut &amp; Tricks</h1>
          <p className="text-sm text-gray-500 mt-1">Hướng dẫn, thủ thuật và tài liệu kỹ thuật</p>
        </div>
        <Link
          href="/admin/tut-tricks/tao-moi"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#A855F7] transition-colors whitespace-nowrap shrink-0"
        >
          + Thêm mới
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng tài liệu</p>
          <p className="text-3xl font-bold text-gray-900">{allTotal.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Đang lọc: {total.toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <p className="text-xs font-medium text-[#10B981] uppercase tracking-wide mb-2">Đang hoạt động</p>
          <p className="text-3xl font-bold text-[#10B981]">{activeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Ẩn: {(allTotal - activeCount).toLocaleString("vi-VN")}</p>
        </div>
        <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 p-5">
          <p className="text-xs font-medium text-[#2563eb] uppercase tracking-wide mb-2">Miễn phí</p>
          <p className="text-3xl font-bold text-[#2563eb]">{freeCount.toLocaleString("vi-VN")}</p>
          <p className="text-xs text-gray-400 mt-1.5">Có phí: {(allTotal - freeCount).toLocaleString("vi-VN")}</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Tìm theo tên tut & trick..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none"
        />
        {category && <input type="hidden" name="category" value={category} />}
        {tier && <input type="hidden" name="tier" value={tier} />}
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors">
          Tìm
        </button>
        {(q ?? category ?? tier) && (
          <Link href={BASE} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors">
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Loại tut filter = tier field (Miễn phí / Có phí) */}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Loại tut</span>
        <Link
          href={buildUrl(BASE, { q, category })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!tier ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"}`}
        >
          Tất cả
        </Link>
        <Link
          href={buildUrl(BASE, { q, category, tier: "Miễn phí" })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tier === "Miễn phí" ? "bg-[#10B981] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#10B981] hover:text-[#10B981]"}`}
        >
          Miễn phí
        </Link>
        <Link
          href={buildUrl(BASE, { q, category, tier: "Có phí" })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tier === "Có phí" ? "bg-[#A855F7] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#A855F7] hover:text-[#A855F7]"}`}
        >
          Có phí
        </Link>

        <span className="text-gray-300 mx-1">|</span>

        {/* Danh mục filter = category field (từ TutTrickCategory) */}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Danh mục</span>
        <Link
          href={buildUrl(BASE, { q, tier })}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!category ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
        >
          Tất cả
        </Link>
        {dbCategories.map((cat) => (
          <Link
            key={cat.name}
            href={buildUrl(BASE, { q, tier, category: cat.name })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === cat.name ? "bg-[#7C3AED] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"}`}
          >
            {cat.iconUrl && (
              <span className={`flex items-center justify-center w-4 h-4 rounded p-0.5 shrink-0 ${category === cat.name ? "bg-white/20" : "bg-white border border-gray-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-full h-full object-contain" />
              </span>
            )}
            {cat.name}
          </Link>
        ))}

        {dbCategories.length === 0 && (
          <Link href="/admin/tut-trick-categories" className="text-xs text-[#7C3AED] hover:underline">
            + Thêm danh mục
          </Link>
        )}

      </div>

      <TutTricksTable
        items={items.map((i) => ({ ...i, price: Number(i.price) }))}
        total={total}
        category={category}
        tier={tier}
        q={q}
        dbCategories={dbCategories}
        currentPage={currentPage}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={BASE}
          searchParams={{
            ...(category ? { category } : {}),
            ...(tier ? { tier } : {}),
            ...(q ? { q } : {}),
          }}
        />
      )}
    </div>
  );
}
