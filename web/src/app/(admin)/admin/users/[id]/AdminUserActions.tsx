"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = [
  { value: "USER",   label: "Người dùng" },
  { value: "SELLER", label: "Nhà bán" },
  { value: "STAFF",  label: "Nhân viên" },
  { value: "ADMIN",  label: "Admin" },
];

interface Props {
  userId: string;
  currentRole: string;
  currentStatus: string;
  discountPercent: number;
  agentDiscountPercent: number;
  isSelf: boolean;
}

export default function AdminUserActions({ userId, currentRole, currentStatus, discountPercent, agentDiscountPercent, isSelf }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [confirmRole, setConfirmRole] = useState(false);
  const [discountAllInput, setDiscountAllInput] = useState(String(discountPercent || agentDiscountPercent));

  async function patch(body: Record<string, unknown>, label: string) {
    setLoading(label);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Thao tác thất bại.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function handleRoleApply() {
    if (selectedRole === currentRole) return;
    if (selectedRole === "STAFF" || selectedRole === "ADMIN") {
      setConfirmRole(true);
    } else {
      void patch({ action: "change_role", role: selectedRole }, "role");
    }
  }

  const isBanned = currentStatus === "BANNED";

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      {/* Ban / Unban */}
      {!isSelf && (
        <button
          onClick={() => patch({ action: isBanned ? "unban" : "ban" }, "ban")}
          disabled={!!loading}
          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
            isBanned
              ? "bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20"
              : "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20"
          }`}
        >
          {loading === "ban" ? "..." : isBanned ? "Bỏ khóa tài khoản" : "Khóa tài khoản"}
        </button>
      )}

      {/* Role changer */}
      {!isSelf && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-xs text-gray-500 font-medium">Phân quyền</p>
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={!!loading}
              className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none disabled:opacity-60"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleRoleApply}
              disabled={!!loading || selectedRole === currentRole}
              className="px-3 py-1.5 rounded-md bg-[#7C3AED] text-white text-xs hover:bg-[#A855F7] disabled:opacity-40 transition-colors"
            >
              {loading === "role" ? "..." : "Áp dụng"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            Quyền hiện tại: <span className="font-semibold text-gray-600">{ROLE_OPTIONS.find(r => r.value === currentRole)?.label ?? currentRole}</span>
          </p>
        </div>
      )}

      {/* Giảm giá — 1 ô nhập set chung cho cả 2 nhóm (Service/Course/Tut và Tài nguyên MMO/Kho/Khương FB) */}
      {/* <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-xs text-gray-500 font-medium">
          Giảm giá (Service / Khóa học / Tut / Tài nguyên MMO / Kho nguyên liệu / Khương FB)
        </p>
        <p className="text-[10px] text-gray-400">
          0 = Service/Course/Tut dùng tier tự động theo tổng nạp (Trên 15tr: +5%; Trên 50tr: +10%; Trên 100tr: +15%), Tài nguyên MMO/Kho/Khương FB không giảm.
          &gt;0 = override cứng cho Service/Course/Tut, đồng thời set % Đại lý cho Tài nguyên MMO/Kho/Khương FB (không phụ thuộc tổng nạp, luôn ưu tiên hơn tier).
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={100}
            value={discountAllInput}
            onChange={(e) => setDiscountAllInput(e.target.value)}
            placeholder="0-100"
            className="w-24 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
          />
          <span className="text-xs text-gray-500">%</span>
          <button
            onClick={() => {
              const pct = parseInt(discountAllInput, 10);
              if (isNaN(pct) || pct < 0 || pct > 100) { setError("% giảm giá phải từ 0-100."); return; }
              void patch({ action: "set_discount_all", percent: pct }, "discountAll");
            }}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-md bg-[#7C3AED] text-white text-xs hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
          >
            {loading === "discountAll" ? "..." : "Lưu"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          Hiện tại: <span className="font-semibold text-gray-600">
            {discountPercent > 0 ? `${discountPercent}% (Service/Course/Tut)` : "Service/Course/Tut: tự động theo tier"}
            {" · "}
            {agentDiscountPercent > 0 ? `${agentDiscountPercent}% (Tài nguyên/Kho/Khương FB)` : "Tài nguyên/Kho/Khương FB: không giảm"}
          </span>
        </p>
      </div> */}

      {/* Confirm modal for STAFF/ADMIN */}
      {confirmRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-sm font-semibold text-gray-900 mb-2">Xác nhận nâng quyền?</p>
            <p className="text-xs text-gray-500 mb-4">
              Bạn đang nâng người dùng này lên{" "}
              <span className="font-semibold text-gray-900">
                {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}
              </span>
              . Hành động sẽ được ghi vào audit log.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirmRole(false); setSelectedRole(currentRole); }}
                className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={() => { setConfirmRole(false); void patch({ action: "change_role", role: selectedRole }, "role"); }}
                className="px-4 py-2 text-xs rounded-lg bg-[#EF4444] text-white hover:bg-red-600"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
