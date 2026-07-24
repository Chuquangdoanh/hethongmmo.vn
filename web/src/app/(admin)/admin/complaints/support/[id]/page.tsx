import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Admin — Chi tiết hỗ trợ sau khi mua" };

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  try { requireStaff(session); } catch { redirect("/"); }
  try { await requirePermission(session, "complaints:read"); } catch { redirect("/admin/complaints"); }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user:   { select: { fullName: true, email: true } },
      seller: { select: { fullName: true, email: true } },
      order:  { select: { id: true, orderCode: true, itemName: true, finalPrice: true, createdAt: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/complaints?tab=support" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Hỗ trợ sau khi mua
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-xs text-gray-500 font-mono">#{id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🛍️</span>
            <h2 className="text-sm font-bold text-gray-800">Thông tin đơn hàng</h2>
          </div>
          <Link
            href={`/admin/orders/${ticket.order.id}`}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
          >
            Xem đơn hàng →
          </Link>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Row label="Mã đơn">
            <span className="text-sm text-gray-600 font-mono">#{ticket.order.orderCode}</span>
          </Row>
          <Row label="Sản phẩm">
            <span className="text-sm font-semibold text-gray-900">{ticket.order.itemName}</span>
          </Row>
          <Row label="Giá trị">
            <span className="text-sm font-bold text-emerald-600">{formatVnd(Number(ticket.order.finalPrice))}</span>
          </Row>
          <Row label="Ngày mua">
            <span className="text-sm text-gray-500">{formatDate(ticket.order.createdAt)}</span>
          </Row>
          <Row label="Người mua">
            <span className="text-sm text-gray-900">{ticket.user.fullName ?? ticket.user.email}</span>
            <span className="text-xs text-gray-400 ml-2">{ticket.user.email}</span>
          </Row>
          <Row label="Người bán">
            <span className="text-sm text-gray-900">{ticket.seller.fullName ?? ticket.seller.email}</span>
            <span className="text-xs text-gray-400 ml-2">{ticket.seller.email}</span>
          </Row>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <span className="text-base">💬</span>
          <h2 className="text-sm font-bold text-gray-800">Trò chuyện hỗ trợ sau khi mua</h2>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {ticket.messages.length === 0 && (
            <p className="text-sm text-center text-gray-400 py-16">Chưa có tin nhắn nào.</p>
          )}
          {ticket.messages.map((msg) => {
            const isBuyer = msg.senderRole === "USER";
            return (
              <div key={msg.id} className={`flex flex-col ${isBuyer ? "items-start" : "items-end"}`}>
                <span className="text-[10px] text-gray-500 mb-0.5 font-medium">
                  {msg.senderName} · {isBuyer ? "Người mua" : "Người bán"}
                </span>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                    isBuyer
                      ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                      : "bg-[#7C3AED] text-white rounded-tr-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                  {formatDate(msg.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-xs text-gray-400 pt-0.5 font-medium">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
