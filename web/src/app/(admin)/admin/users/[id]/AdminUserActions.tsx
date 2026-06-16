"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

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
  balance: number;
  discountPercent: number;
  isSelf: boolean;
}

export default function AdminUserActions({ userId, currentRole, currentStatus, balance, discountPercent, isSelf }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [confirmRole, setConfirmRole] = useState(false);
  const [discountInput, setDiscountInput] = useState(String(discountPercent));

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

  async function adjustBalance() {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) { setError("Số tiền không hợp lệ."); return; }
    await patch({ action: "adjust_balance", amount, note: adjustNote.trim() || undefined }, "adjust");
    setAdjustAmount("");
    setAdjustNote("");
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

      {/* Balance adjustment */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-xs text-gray-500">Điều chỉnh số dư (hiện tại: <span className="font-medium text-gray-700">{formatVnd(balance)}</span>)</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="VD: 50000 hoặc -50000"
            className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
          />
          <button
            onClick={adjustBalance}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-md bg-[#7C3AED] text-white text-xs hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
          >
            {loading === "adjust" ? "..." : "Áp dụng"}
          </button>
        </div>
        <input
          type="text"
          value={adjustNote}
          onChange={(e) => setAdjustNote(e.target.value)}
          placeholder="Ghi chú (bắt buộc)"
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
        />
      </div>

      {/* Discount override */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-xs text-gray-500 font-medium">
          Giảm giá khi mua (Service / Khóa học / Tut)
        </p>
        <p className="text-[10px] text-gray-400">
          0 = dùng tier tự động (Trên 15tr: +5% - Chuyên Gia Tăng Trưởng; Trên 50tr: +10% - Chuyên Gia Bứt Phá; Trên 100tr: +15% - Đối Tác Toàn Diện). &gt;0 = override cứng.
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={100}
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="0-100"
            className="w-24 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
          />
          <span className="text-xs text-gray-500">%</span>
          <button
            onClick={() => {
              const pct = parseInt(discountInput, 10);
              if (isNaN(pct) || pct < 0 || pct > 100) { setError("% giảm giá phải từ 0-100."); return; }
              void patch({ action: "set_discount", discountPercent: pct }, "discount");
            }}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-md bg-[#7C3AED] text-white text-xs hover:bg-[#A855F7] disabled:opacity-60 transition-colors"
          >
            {loading === "discount" ? "..." : "Lưu"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          Hiện tại: <span className="font-semibold text-gray-600">{discountPercent > 0 ? `${discountPercent}% (admin override)` : "Tự động theo tier"}</span>
        </p>
      </div>

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
