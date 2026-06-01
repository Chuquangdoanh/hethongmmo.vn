import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Pagination from "@/components/shared/Pagination";

export const metadata: Metadata = { title: "Audit Log" };

const PAGE_SIZE = 30;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { page, action } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const where = action ? { action: { contains: action, mode: "insensitive" as const } } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { email: true, fullName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} bản ghi</span>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thời gian</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hành động</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={`${i !== 0 ? "border-t border-gray-200" : ""}`}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{log.actor?.email ?? "system"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-[#A855F7]">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {log.targetType}:{log.targetId?.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/audit-log" />
      )}
    </div>
  );
}
