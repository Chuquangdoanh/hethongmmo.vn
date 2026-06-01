"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SellerTier } from "@prisma/client";

const TIER_META: Record<SellerTier, { label: string; badge: string; description: string }> = {
  STANDARD: { label: "Standard", badge: "bg-gray-100 text-gray-600", description: "Hạng mặc định" },
  SILVER:   { label: "Silver",   badge: "bg-slate-100 text-slate-600", description: "Phí thấp hơn, giữ đơn ngắn hơn" },
  GOLD:     { label: "Gold",     badge: "bg-amber-100 text-amber-700", description: "Ưu đãi tốt, phí thấp" },
  VIP:      { label: "VIP",      badge: "bg-violet-100 text-violet-700", description: "Ưu đãi cao nhất" },
};

const TIERS = Object.keys(TIER_META) as SellerTier[];

interface Props {
  sellerId: string;
  currentTier: SellerTier;
}

export default function SellerTierForm({ sellerId, currentTier }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<SellerTier>(currentTier);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (selected === currentTier) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected }),
      });
      const json = await res.json() as { success: boolean; message?: string; error?: string };
      if (!res.ok || !json.success) {
        setMessage(json.error ?? "Cập nhật thất bại");
        return;
      }
      setMessage("Đã cập nhật hạng seller");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const currentMeta = TIER_META[currentTier];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Hạng seller (Chế độ ưu đãi)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Hạng hiện tại:{" "}
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${currentMeta.badge}`}>
              {currentMeta.label}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {TIERS.map((tier) => {
          const meta = TIER_META[tier];
          const isSelected = selected === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelected(tier)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-violet-400 bg-violet-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className={`text-sm font-semibold ${isSelected ? "text-violet-700" : "text-gray-700"}`}>
                {meta.label}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{meta.description}</p>
            </button>
          );
        })}
      </div>

      {message && (
        <p className={`text-xs mb-3 ${message.includes("thất bại") ? "text-red-500" : "text-emerald-600"}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loading || selected === currentTier}
        className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Đang lưu..." : `Chuyển sang ${TIER_META[selected].label}`}
      </button>
    </div>
  );
}
