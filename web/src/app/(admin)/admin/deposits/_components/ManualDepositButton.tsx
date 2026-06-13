"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface DepositResult {
  email: string;
  fullName: string;
  amount: number;
}

export default function ManualDepositButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [email, setEmail]   = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<DepositResult | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  function openModal() {
    setEmail(""); setAmount(""); setNote("");
    setError(null); setSuccess(null);
    setOpen(true);
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  function closeModal() {
    setOpen(false);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 1000) { setError("Số tiền tối thiểu 1.000đ"); return; }

    startTransition(async () => {
      const res = await fetch("/api/admin/deposits/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email, amount: amt, note }),
      });
      const json = (await res.json()) as { data?: DepositResult; error?: string };
      if (!res.ok || !json.data) {
        setError(json.error ?? "Lỗi không xác định");
        return;
      }
      setSuccess(json.data);
      startTransition(() => router.refresh());
    });
  }

  const displayAmount = amount.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
      >
        + Nạp thủ công
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Nạp tiền thủ công</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cộng tiền trực tiếp vào số dư người dùng</p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            {success ? (
              <div className="px-6 py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">Nạp tiền thành công</p>
                <p className="text-xs text-gray-500">
                  Đã cộng <span className="font-bold text-emerald-600">{formatVnd(success.amount)}</span> cho
                  <br />
                  <span className="font-medium text-gray-700">{success.fullName}</span> ({success.email})
                </p>
                <button
                  onClick={closeModal}
                  className="mt-2 px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email người dùng <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    suppressHydrationWarning
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Số tiền */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Số tiền (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={displayAmount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="100.000"
                      required
                      suppressHydrationWarning
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">đ</span>
                  </div>
                  {amount && parseInt(amount, 10) >= 1000 && (
                    <p className="text-[11px] text-emerald-600 mt-1">= {formatVnd(parseInt(amount, 10))}</p>
                  )}
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Ghi chú / Lý do <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Hoàn tiền khiếu nại đơn #ORD..."
                    required
                    minLength={3}
                    suppressHydrationWarning
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Ghi chú được lưu vào audit log</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                {/* Warning */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
                  <p className="text-[11px] text-amber-700">
                    Hành động này sẽ <strong>cộng tiền ngay</strong> vào số dư và không thể hoàn tác. Chỉ dùng cho hoàn tiền, bồi thường, hoặc trường hợp đặc biệt.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:border-gray-300 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !email || !amount || !note}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? "Đang xử lý..." : "Xác nhận nạp"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
