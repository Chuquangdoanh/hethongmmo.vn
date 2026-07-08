import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import CouponRowActions from "./_components/CouponRowActions";

export const metadata: Metadata = { title: "Admin — Mã giảm giá" };

const PAGE_SIZE = 20;

type CouponBadge = "off" | "expired" | "exhausted" | "running";

function resolveCouponBadge(c: { isActive: boolean; endAt: Date; usedCount: number; maxUses: number }): CouponBadge {
  if (!c.isActive) return "off";
  if (Date.now() > c.endAt.getTime()) return "expired";
  if (c.usedCount >= c.maxUses) return "exhausted";
  return "running";
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;
  if (!me || me.role !== "ADMIN") redirect("/admin/dashboard");

  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = { deletedAt: null as null };
  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, code: true, name: true, discountType: true, discountValue: true,
        maxUses: true, usedCount: true, startAt: true, endAt: true, isActive: true,
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mã giảm giá</h1>
          <p className="text-sm text-gray-500 mt-0.5">Áp dụng cho Kho tài nguyên / Tài nguyên MMO / Khương FB</p>
        </div>
        <Link
          href="/admin/coupons/tao-moi"
          className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-sm font-semibold hover:bg-[#1e40af] transition-colors"
        >
          + Tạo mã giảm giá
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Mã</th>
              <th className="text-left px-4 py-2.5">Tên</th>
              <th className="text-left px-4 py-2.5">Giảm giá</th>
              <th className="text-left px-4 py-2.5">Đã dùng</th>
              <th className="text-left px-4 py-2.5">Thời gian</th>
              <th className="text-left px-4 py-2.5">Trạng thái</th>
              <th className="text-right px-4 py-2.5">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chưa có mã giảm giá nào</td>
              </tr>
            ) : (
              coupons.map((c) => {
                const badge = resolveCouponBadge(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{c.code}</td>
                    <td className="px-4 py-2.5 text-gray-700">{c.name}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {c.discountType === "PERCENT" ? `${Number(c.discountValue)}%` : formatVnd(Number(c.discountValue))}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.usedCount}/{c.maxUses}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {formatDate(c.startAt)} → {formatDate(c.endAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {badge === "off" ? (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Đã tắt</span>
                      ) : badge === "expired" ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">Hết hạn</span>
                      ) : badge === "exhausted" ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">Hết lượt</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">Đang chạy</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <CouponRowActions couponId={c.id} isActive={c.isActive} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/coupons" />
      )}
    </div>
  );
}
