"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SellerTierDefinition } from "@prisma/client";

interface Props {
  sellerId:    string;
  currentTier: string;
  tiers:       Pick<SellerTierDefinition, "id" | "key" | "label" | "description" | "badgeColor">[];
}

const COLOR_BADGE: Record<string, string> = {
  gray:   "bg-gray-100 text-gray-700",
  slate:  "bg-slate-100 text-slate-700",
  amber:  "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
  pink:   "bg-pink-100 text-pink-700",
  orange: "bg-orange-100 text-orange-700",
  teal:   "bg-teal-100 text-teal-700",
};

export default function SellerTierForm({ sellerId, currentTier, tiers }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentTier);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");

  const currentMeta = tiers.find((t) => t.key === currentTier);

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
      const json = await res.json() as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !json.success) { setMessage(json.error ?? "Cập nhật thất bại"); return; }
      setMessage("Đã cập nhật hạng seller");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Hạng seller (Chế độ ưu đãi)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Hạng hiện tại:{" "}
            {currentMeta && (
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[currentMeta.badgeColor] ?? COLOR_BADGE["gray"]}`}>
                {currentMeta.label}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {tiers.map((tier) => {
          const isSelected = selected === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => setSelected(tier.key)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${COLOR_BADGE[tier.badgeColor] ?? COLOR_BADGE["gray"]}`}>
                  {tier.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">{tier.description ?? ""}</p>
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
        {loading ? "Đang lưu..." : `Chuyển sang ${tiers.find((t) => t.key === selected)?.label ?? selected}`}
      </button>
    </div>
  );
}
