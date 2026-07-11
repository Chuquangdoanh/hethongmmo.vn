import { TxType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Dùng chung giữa GET /api/admin/badges (poll một lần) và SSE /api/admin/badges/stream.
export async function getAdminBadgeCounts() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [orders, complaints, withdrawals, deposits, banTaiNguyen, adsRegPending, fanpageRegPending] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.complaint.count({ where: { status: { in: ["IN_REVIEW", "PENDING_ADMIN"] } } }),
    prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({
      where: { type: { in: [TxType.DEPOSIT_AUTO, TxType.DEPOSIT_MANUAL] }, createdAt: { gt: since24h } },
    }),
    prisma.order.count({
      where: { status: "PENDING", orderType: { in: ["MMO_PRODUCT", "SELLER_PRODUCT", "KHUONGFB_PRODUCT"] } },
    }),
    prisma.adsRegistration.count({ where: { status: "PENDING" } }),
    prisma.fanpageRegistration.count({ where: { status: "PENDING" } }),
  ]);

  return {
    orders, complaints, withdrawals, deposits,
    banTaiNguyen,
    dangKyDichVu: adsRegPending + fanpageRegPending,
  };
}
