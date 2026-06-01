import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Admin — Quản lý Chat" };

const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  OPEN:      "Mở",
  IN_REVIEW: "Đang xét",
  RESOLVED:  "Đã xử lý",
  REJECTED:  "Từ chối",
};

const COMPLAINT_STATUS_CLS: Record<string, string> = {
  OPEN:      "bg-red-50 text-red-600",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  RESOLVED:  "bg-emerald-50 text-emerald-700",
  REJECTED:  "bg-gray-50 text-gray-500",
};

export default async function AdminChatsPage() {
  const rooms = await prisma.chatRoom.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      complaint: {
        select: {
          id: true, subject: true, status: true,
          user: { select: { fullName: true, email: true } },
        },
      },
      participants: { select: { label: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { senderName: true, content: true, createdAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Chat</h1>
        <span className="text-sm text-gray-500">{rooms.length} phòng chat</span>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white text-center py-16">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sm font-medium text-gray-700">Chưa có phòng chat nào</p>
          <p className="text-xs text-gray-400 mt-1">Phòng chat được tạo từ trang chi tiết khiếu nại</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Khiếu nại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người dùng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thành viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tin nhắn cuối</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, i) => {
                const last = room.messages[0];
                const statusCls = COMPLAINT_STATUS_CLS[room.complaint.status] ?? "";
                return (
                  <tr
                    key={room.id}
                    className={`${i !== 0 ? "border-t border-gray-200" : ""} hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-gray-800 truncate">{room.complaint.subject}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCls}`}>
                        {COMPLAINT_STATUS_LABEL[room.complaint.status] ?? room.complaint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">
                        {room.complaint.user.fullName ?? room.complaint.user.email}
                      </p>
                      <p className="text-[11px] text-gray-400">{room.complaint.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {room.participants.map((p) => p.label).join(", ")}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {last ? (
                        <>
                          <p className="text-xs text-gray-600 truncate">
                            <span className="font-medium">{last.senderName}:</span> {last.content}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(last.createdAt)}</p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa có tin nhắn</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(room.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/complaints/${room.complaint.id}`}
                        className="text-xs text-[#7C3AED] hover:text-[#A855F7]"
                      >
                        Mở chat →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
