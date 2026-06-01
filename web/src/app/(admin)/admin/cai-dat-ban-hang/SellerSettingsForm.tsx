"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/utils/format";
import type { SlotPackage, TierConfig, SellerTierKey } from "@/lib/services/seller.service";

const TIERS: { key: SellerTierKey; label: string; color: string }[] = [
  { key: "STANDARD", label: "Standard", color: "text-gray-600" },
  { key: "SILVER",   label: "Silver",   color: "text-slate-500" },
  { key: "GOLD",     label: "Gold",     color: "text-amber-600" },
  { key: "VIP",      label: "VIP",      color: "text-violet-600" },
];

interface Props {
  initialFeePercent: number;
  initialMinAmount: number;
  initialHoldDays: number;
  initialSlotPackages: SlotPackage[];
  initialTierConfig: Record<SellerTierKey, TierConfig>;
}

export default function SellerSettingsForm({
  initialFeePercent,
  initialMinAmount,
  initialHoldDays,
  initialSlotPackages,
  initialTierConfig,
}: Props) {
  const [feePercent, setFeePercent] = useState(String(initialFeePercent));
  const [minAmount, setMinAmount] = useState(String(initialMinAmount));
  const [holdDays, setHoldDays] = useState(String(initialHoldDays));
  const [packages, setPackages] = useState<SlotPackage[]>(initialSlotPackages);
  const [tierConfig, setTierConfig] = useState<Record<SellerTierKey, TierConfig>>(initialTierConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateTier(tier: SellerTierKey, field: keyof TierConfig, value: string) {
    setTierConfig((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: parseFloat(value) || 0 },
    }));
  }

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
          min_withdrawal_amount: parseInt(minAmount) || 0,
          order_hold_days: parseInt(holdDays) || 0,
          slot_packages: packages,
          tier_config: tierConfig,
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Lưu thất bại.");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  const previewFee = Math.floor((parseFloat(feePercent) || 0) / 100 * 1_000_000);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ══ CỘT TRÁI: Rút tiền + Tier ══ */}
        <div className="space-y-7">

          {/* ── Withdrawal settings ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cài đặt rút tiền (mặc định)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Phí rút tiền (%)
                </label>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Số tiền rút tối thiểu (đ)
                </label>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Số ngày giữ đơn (ngày)
                </label>
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
            </div>
          </div>

          {/* ── Tier config ── */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Chế độ ưu đãi theo hạng seller</h3>
              <p className="text-xs text-gray-400 mt-0.5">Mỗi hạng có phí rút, số tiền tối thiểu, và số ngày giữ đơn riêng</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-semibold text-gray-500 w-20">Hạng</th>
                    <th className="pb-2 text-left text-xs font-semibold text-gray-500">Phí (%)</th>
                    <th className="pb-2 text-left text-xs font-semibold text-gray-500">Tối thiểu (đ)</th>
                    <th className="pb-2 text-left text-xs font-semibold text-gray-500">Giữ đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {TIERS.map(({ key, label, color }) => (
                    <tr key={key}>
                      <td className="py-2.5 pr-3">
                        <span className={`font-bold text-sm ${color}`}>{label}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <input
                          type="number"
                          value={tierConfig[key].fee_percent}
                          onChange={(e) => updateTier(key, "fee_percent", e.target.value)}
                          min={0} max={50} step={0.5}
                          className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <input
                          type="number"
                          value={tierConfig[key].min_withdrawal}
                          onChange={(e) => updateTier(key, "min_withdrawal", e.target.value)}
                          min={0} step={10000}
                          className="w-32 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>
                          {formatVnd(tierConfig[key].min_withdrawal)}
                        </p>
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          value={tierConfig[key].hold_days}
                          onChange={(e) => updateTier(key, "hold_days", e.target.value)}
                          min={0} max={30} step={1}
                          className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3">
              <p className="text-xs text-violet-700">
                Gán hạng cho seller tại trang <strong>Quản lý Sellers</strong>. Hệ thống tự dùng cấu hình của hạng tương ứng khi seller rút tiền.
              </p>
            </div>
          </div>

        </div>

        {/* ══ CỘT PHẢI: Slot packages + Điều kiện ══ */}
        <div className="space-y-7">

          {/* ── Slot packages ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Gói slot sản phẩm</h3>
                <p className="text-xs text-gray-400 mt-0.5">Seller mua để tăng số lượng sản phẩm tối đa</p>
              </div>
              <button
                type="button"
                onClick={addPackage}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
              >
                + Thêm gói
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Xóa gói"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                <strong>Lưu ý:</strong> Khi seller mua gói, <code>maxSellerProducts</code> được cập nhật bằng số slot đó (không cộng thêm). Phí trừ trực tiếp khỏi số dư.
              </p>
            </div>
          </div>

          {/* ── Điều kiện rút tiền ── */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Điều kiện đơn hàng đủ điều kiện rút:</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li>Trạng thái: <strong>DONE</strong> (hoàn thành)</li>
              <li>Chưa rút (<code>withdrawn = false</code>)</li>
              <li>Thuộc seller (sellerId = uid của seller)</li>
              <li>Tuổi đơn &gt; <strong>{holdDays} ngày</strong></li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Đã lưu cấu hình thành công</p>}
        <button
          type="submit"
          disabled={loading}
          className="ml-auto px-6 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </form>
  );
}
