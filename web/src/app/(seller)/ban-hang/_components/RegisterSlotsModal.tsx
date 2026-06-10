"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/utils/format";
import type { SlotPackage } from "@/lib/services/seller.service";

interface Props {
  packages: SlotPackage[];
  currentSlots: number;
  userBalance: number;
}

export default function RegisterSlotsModal({ packages, currentSlots, userBalance }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SlotPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleOpen() {
    setSelected(null);
    setError("");
    setSuccess(false);
    setIsOpen(true);
  }

  function handleClose() {
    if (loading) return;
    setIsOpen(false);
    setSelected(null);
    setError("");
  }

  async function handleConfirm() {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/seller/buy-slots", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: selected.slots }),
      });
      const json = await res.json() as { success: boolean; message?: string; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Có lỗi xảy ra, thử lại sau");
        return;
      }
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError("Lỗi kết nối, thử lại sau");
    } finally {
      setLoading(false);
    }
  }

  const balanceAfter = selected ? userBalance - selected.price : userBalance;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
      >
        Đăng kí slot
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Đăng kí số lượng sản phẩm</h3>
                <p className="text-xs text-gray-500 mt-0.5">Chọn gói phù hợp để tăng giới hạn sản phẩm trên gian hàng</p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg leading-none disabled:opacity-40"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-3">

              {/* Current slot info */}
              <div className="flex items-center justify-between text-xs rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                <span className="text-blue-700 font-medium">Slot hiện tại của bạn:</span>
                <span className="font-bold text-blue-800">{currentSlots} sản phẩm</span>
              </div>

              {/* Package list */}
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const canAfford = userBalance >= pkg.price;
                  const isCurrent = pkg.slots === currentSlots;
                  const isSelected = selected?.slots === pkg.slots;

                  return (
                    <button
                      key={pkg.slots}
                      type="button"
                      onClick={() => { if (!isCurrent && canAfford) setSelected(pkg); }}
                      disabled={isCurrent || !canAfford}
                      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-50"
                          : isCurrent
                          ? "border-emerald-300 bg-emerald-50 cursor-default"
                          : !canAfford
                          ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                          : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">{pkg.slots} sản phẩm</p>
                        {isCurrent && (
                          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Gói hiện tại</p>
                        )}
                        {!canAfford && !isCurrent && (
                          <p className="text-[10px] text-red-500 mt-0.5">Số dư không đủ</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-violet-600">{formatVnd(pkg.price)}</p>
                        {isSelected && (
                          <p className="text-[10px] text-violet-500 mt-0.5">Đã chọn</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Balance info */}
              <div className="flex items-center justify-between text-xs rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
                <span className="text-gray-500">Số dư hiện tại:</span>
                <span className="font-bold text-gray-800">{formatVnd(userBalance)}</span>
              </div>

              {/* Confirm summary */}
              {selected && !success && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-xs text-amber-800">
                    Mua gói <strong>{selected.slots} slot</strong> với giá <strong>{formatVnd(selected.price)}</strong>.
                    Số dư sau mua: <strong className={balanceAfter < 0 ? "text-red-600" : "text-emerald-700"}>{formatVnd(balanceAfter)}</strong>
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
              {success && (
                <p className="text-sm text-emerald-600 font-medium">Đã đăng kí thành công! Đang tải lại...</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selected || loading || success}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Xác nhận mua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
