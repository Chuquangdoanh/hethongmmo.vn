"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ORDER_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "",                 label: "Tất cả loại sản phẩm" },
  { value: "SERVICE",          label: "Dịch vụ" },
  { value: "COURSE",           label: "Khóa học" },
  { value: "TUTTRICK",         label: "Tut / Tricks" },
  { value: "MMO_PRODUCT",      label: "Tài nguyên MMO" },
  { value: "SELLER_PRODUCT",   label: "Sản phẩm Seller" },
  { value: "KHUONGFB_PRODUCT", label: "Sản phẩm Khuongfb" },
];

export default function CreateRuleForm() {
  const router = useRouter();
  const [affiliateId, setAffiliateId] = useState("");
  const [orderType, setOrderType] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [priority, setPriority] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const percent = Number(commissionPercent);
    if (!commissionPercent || Number.isNaN(percent) || percent < 0 || percent > 100) {
      setError("% hoa hồng phải trong khoảng 0–100");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/affiliate-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: affiliateId.trim() || null,
          orderType: orderType || null,
          commissionPercent: percent,
          priority: Number(priority) || 0,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra");
      setAffiliateId("");
      setOrderType("");
      setCommissionPercent("");
      setPriority("0");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Kết hợp <strong>Affiliate ID</strong> + <strong>Loại sản phẩm</strong> để tạo mức hoa hồng riêng theo từng hạng mục
        (VD: Affiliate X nhận 10% khi khách mua Khóa học). Rule càng cụ thể càng được ưu tiên: Affiliate + Loại sản phẩm &gt;
        Affiliate riêng &gt; Loại sản phẩm chung &gt; Mặc định toàn hệ thống.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={affiliateId}
          onChange={(e) => setAffiliateId(e.target.value)}
          placeholder="Affiliate ID (để trống = áp dụng mọi Affiliate)"
          className="flex-1 min-w-55 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {ORDER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(e.target.value)}
          placeholder="% hoa hồng"
          type="number"
          min={0}
          max={100}
          step="0.01"
          className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="Priority"
          type="number"
          min={0}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Đang tạo..." : "Tạo rule"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
