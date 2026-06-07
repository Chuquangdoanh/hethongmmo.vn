"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/utils/format";
import { ArrowDownToLine, Boxes } from "lucide-react";
import type { SlotPackage } from "@/lib/services/seller.service";

interface Props {
  initialFeePercent: number;
  initialMinAmount: number;
  initialHoldDays: number;
  initialSlotPackages: SlotPackage[];
  initialRegistrationFee: number;
}

export default function SellerSettingsForm({
  initialFeePercent,
  initialMinAmount,
  initialHoldDays,
  initialSlotPackages,
  initialRegistrationFee,
}: Props) {
  const [feePercent, setFeePercent]       = useState(String(initialFeePercent));
  const [minAmount, setMinAmount]         = useState(String(initialMinAmount));
  const [holdDays, setHoldDays]           = useState(String(initialHoldDays));
  const [registrationFee, setRegistrationFee] = useState(String(initialRegistrationFee));
  const [packages, setPackages]           = useState<SlotPackage[]>(initialSlotPackages);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState(false);

  function updatePackage(index: number, field: keyof SlotPackage, value: string) {
    setPackages((prev) =>
      prev.map((pkg, i) =>
        i === index ? { ...pkg, [field]: parseInt(value) || 0 } : pkg,
      ),
    );
  }

  function addPackage() {
    setPackages((prev) => [...prev, { slots: 0, price: 0 }]);
  }

  function removePackage(index: number) {
    if (packages.length <= 1) return;
    setPackages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seller-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawal_fee_percent: parseFloat(feePercent) || 0,
          min_withdrawal_amount:  parseInt(minAmount) || 0,
          order_hold_days:        parseInt(holdDays) || 0,
          registration_fee:       parseInt(registrationFee) || 0,
          slot_packages:          packages,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Lưu thất bại."); return; }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  const previewFee = Math.floor((parseFloat(feePercent) || 0) / 100 * 1_000_000);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-5">

        {/* ── Card 1: Cấu hình rút tiền ── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <ArrowDownToLine size={15} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Cấu hình rút tiền</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Áp dụng cho seller hạng STANDARD</p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phí rút tiền (%)</label>
              <input
                type="number"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                min={0} max={50} step={0.5}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1" suppressHydrationWarning>
                VD: rút 1.000.000đ → phí {formatVnd(previewFee)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Số tiền rút tối thiểu (đ)</label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                min={0} step={10000}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1" suppressHydrationWarning>
                Hiện tại: {formatVnd(parseInt(minAmount) || 0)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Số ngày giữ đơn (ngày)</label>
              <input
                type="number"
                value={holdDays}
                onChange={(e) => setHoldDays(e.target.value)}
                min={0} max={30} step={1}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Đơn phải hoàn thành &gt; {holdDays} ngày mới được rút
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phí đăng ký bán hàng (đ)</label>
              <input
                type="number"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                min={0} step={1000}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1" suppressHydrationWarning>
                Hiện tại: {formatVnd(parseInt(registrationFee) || 0)} — trừ khi người dùng nộp đơn đăng ký seller
              </p>
            </div>

            {/* Điều kiện đơn đủ rút */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mt-1">
              <p className="text-xs font-semibold text-blue-700 mb-1.5">Điều kiện đơn hàng đủ điều kiện rút:</p>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                <li>Trạng thái: <strong>DONE</strong> (hoàn thành)</li>
                <li>Chưa rút (<code>withdrawn = false</code>)</li>
                <li>Thuộc seller (sellerId = uid của seller)</li>
                <li>Tuổi đơn &gt; <strong>{holdDays} ngày</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Card 2: Gói slot sản phẩm ── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Boxes size={15} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Gói slot sản phẩm</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Seller mua để tăng số sản phẩm tối đa</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addPackage}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
            >
              + Thêm gói
            </button>
          </div>

          <div className="px-5 py-5 space-y-3">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>Số slot (sp)</span>
              <span>Giá (đ)</span>
              <span></span>
            </div>

            {packages.map((pkg, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                <input
                  type="number"
                  value={pkg.slots}
                  onChange={(e) => updatePackage(i, "slots", e.target.value)}
                  min={1} max={100}
                  placeholder="VD: 5"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
                />
                <div>
                  <input
                    type="number"
                    value={pkg.price}
                    onChange={(e) => updatePackage(i, "price", e.target.value)}
                    min={0} step={1000}
                    placeholder="VD: 50000"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                    {formatVnd(pkg.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePackage(i)}
                  disabled={packages.length <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                  title="Xóa gói"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mt-2">
              <p className="text-xs text-blue-700">
                <strong>Lưu ý:</strong> Khi seller mua gói, <code>maxSellerProducts</code> được cập nhật bằng số slot đó (không cộng thêm). Phí trừ trực tiếp khỏi số dư.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save footer ── */}
      <div className="mt-4 flex items-center justify-end gap-4">
        {error   && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Đã lưu cấu hình thành công</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </form>
  );
}
