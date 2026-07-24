import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";
import AdminFilterBar from "@/components/admin/filters/AdminFilterBar";

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
  PRESALE_CHAT:   "Trước khi mua",
  SUPPORT_TICKET: "Sau khi mua",
  COMPLAINT_CHAT: "Khiếu nại",
};

export default async function ChatViolationsTabContent({
  page,
  source,
  role,
}: {
  page?: string;
  source?: string;
  role?: string;
}) {
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = {
    ...(source ? { source: source as never } : {}),
    ...(role ? { senderRole: role } : {}),
  };

  const [violations, total] = await Promise.all([
    prisma.chatViolation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { sender: { select: { fullName: true, email: true } } },
    }),
    prisma.chatViolation.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vi phạm chat</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} tin nhắn bị chặn</span>
        </div>
        <Link
          href="/admin/complaints/moderation"
          className="text-xs font-semibold text-[#7C3AED] hover:text-[#A855F7] transition-colors"
        >
          ⚙️ Cài đặt từ cấm
        </Link>
      </div>

      <AdminFilterBar
        basePath="/admin/complaints"
        preserveParams={["tab"]}
        selects={[
          {
            paramKey: "source",
            label: "Nguồn",
            placeholder: "Tất cả nguồn",
            options: [
              { value: "PRESALE_CHAT", label: "Trước khi mua" },
              { value: "SUPPORT_TICKET", label: "Sau khi mua" },
              { value: "COMPLAINT_CHAT", label: "Khiếu nại" },
            ],
          },
          {
            paramKey: "role",
            label: "Vai trò",
            placeholder: "Tất cả vai trò",
            options: [
              { value: "USER", label: "Người mua" },
              { value: "SELLER", label: "Nhà bán hàng" },
            ],
          },
        ]}
      />

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người gửi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nguồn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vi phạm</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nội dung gốc</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {violations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  Chưa có vi phạm nào được ghi nhận
                </td>
              </tr>
            )}
            {violations.map((v, i) => (
              <tr key={v.id} className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-100 transition-colors`}>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{v.sender.fullName ?? v.sender.email}</p>
                  <p className="text-[11px] text-gray-500">{v.sender.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    v.senderRole === "SELLER"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {v.senderRole === "SELLER" ? "Nhà bán hàng" : "Người mua"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{SOURCE_LABELS[v.source] ?? v.source}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    {v.matchedTerm}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[280px]">
                  <p className="text-xs font-mono text-gray-600 break-all line-clamp-2">{v.content}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(v.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/admin/complaints"
          searchParams={{
            tab: "violations",
            ...(source ? { source } : {}),
            ...(role ? { role } : {}),
          }}
        />
      )}
    </div>
  );
}
