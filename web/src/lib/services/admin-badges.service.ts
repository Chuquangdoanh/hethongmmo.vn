import { TxType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Dùng chung giữa GET /api/admin/badges (poll một lần) và SSE /api/admin/badges/stream.
export async function getAdminBadgeCounts() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [orders, complaints, withdrawals, deposits, banTaiNguyen, adsRegPending, fanpageRegPending, doiTacRows] = await Promise.all([
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
    // Chat hỗ trợ gian hàng đối tác đang mở & tin cuối cùng của khách (chờ admin trả lời)
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM partner_support_threads t
      WHERE t.status = 'OPEN'
        AND (
          SELECT m.sender_role FROM partner_support_messages m
          WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1
        ) = 'USER'
    `,
  ]);

  return {
    orders, complaints, withdrawals, deposits,
    banTaiNguyen,
    dangKyDichVu: adsRegPending + fanpageRegPending,
    doiTacHoTro: doiTacRows[0]?.count ?? 0,
  };
}
