"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Check, ArrowUp, ArrowDown, Save } from "lucide-react";

interface Variant {
  id: string;
  variantName: string | null;
  variantPrice: number;
  isActive: boolean;
}

interface PackageFeatures {
  features: string[];
  variantFlags: Record<string, boolean[]>;
}

interface Props {
  productId: string;
  initialPackageFeatures: PackageFeatures | null;
}

function variantLabel(v: Variant, index: number) {
  return v.variantName?.trim() ? v.variantName : `Gói ${index + 1}`;
}

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export default function FeatureMatrixManager({ productId, initialPackageFeatures }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [features, setFeatures] = useState<string[]>(initialPackageFeatures?.features ?? []);
  const [variantFlags, setVariantFlags] = useState<Record<string, boolean[]>>(initialPackageFeatures?.variantFlags ?? {});
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchVariants = useCallback(async () => {
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/products/mmo/${productId}/variants`, { credentials: "include" });
      const json = await res.json() as { success?: boolean; data?: Variant[] };
      setVariants(json.data ?? []);
    } finally {
      setLoadingVariants(false);
    }
  }, [productId]);

  useEffect(() => { void fetchVariants(); }, [fetchVariants]);

  function flagsForVariant(variantId: string): boolean[] {
    const row = variantFlags[variantId] ?? [];
    return features.map((_, i) => row[i] ?? false);
  }

  function toggleFlag(variantId: string, featureIndex: number) {
    setSaved(false);
    setVariantFlags((prev) => {
      const current = prev[variantId] ?? features.map(() => false);
      const next = [...current];
      next[featureIndex] = !next[featureIndex];
      return { ...prev, [variantId]: next };
    });
  }

  function addFeature() {
    const label = newFeature.trim();
    if (!label) return;
    setSaved(false);
    setFeatures((prev) => [...prev, label]);
    setNewFeature("");
  }

  function removeFeature(index: number) {
    setSaved(false);
    setFeatures((prev) => prev.filter((_, i) => i !== index));
    setVariantFlags((prev) => {
      const next: Record<string, boolean[]> = {};
      for (const [vid, flags] of Object.entries(prev)) {
        next[vid] = flags.filter((_, i) => i !== index);
      }
      return next;
    });
  }

  function moveFeature(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= features.length) return;
    setSaved(false);
    setFeatures((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setVariantFlags((prev) => {
      const next: Record<string, boolean[]> = {};
      for (const [vid, flags] of Object.entries(prev)) {
        const copy = [...flags];
        [copy[index], copy[target]] = [copy[target] ?? false, copy[index] ?? false];
        next[vid] = copy;
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/products/mmo/${productId}/feature-matrix`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, variantFlags }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Lưu thất bại"); return; }
      setSaved(true);
    } catch {
      setError("Lỗi kết nối mạng");
    } finally {
      setSaving(false);
    }
  }

  if (loadingVariants) {
    return <p className="text-sm text-gray-400">Đang tải danh sách gói...</p>;
  }

  if (variants.length < 2) {
    return (
      <p className="text-sm text-gray-500">
        Cần ít nhất 2 gói sản phẩm (xem mục &quot;Gói sản phẩm&quot; phía trên) để cấu hình bảng so sánh tính năng.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add feature row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
          placeholder="VD: Mở khóa iCloud, Giữ nguyên dữ liệu..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={addFeature}
          disabled={!newFeature.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={13} /> Thêm dòng
        </button>
      </div>

      {/* Matrix table */}
      {features.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Chưa có dòng tính năng nào. Thêm dòng đầu tiên ở trên.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tính năng</th>
                  {variants.map((v, i) => (
                    <th key={v.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {variantLabel(v, i)}
                      <span className="block font-normal text-gray-400">{formatVnd(v.variantPrice)}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {features.map((label, featureIndex) => (
                  <tr key={featureIndex} className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-800">{label}</td>
                    {variants.map((v) => {
                      const flags = flagsForVariant(v.id);
                      const checked = flags[featureIndex] ?? false;
                      return (
                        <td key={v.id} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleFlag(v.id, featureIndex)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center mx-auto transition-colors ${
                              checked
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-white border-gray-200 text-transparent hover:border-amber-400"
                            }`}
                          >
                            <Check size={13} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => moveFeature(featureIndex, -1)} disabled={featureIndex === 0}
                          className="p-1 rounded text-gray-400 hover:text-amber-600 disabled:opacity-30 transition-colors" title="Lên">
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveFeature(featureIndex, 1)} disabled={featureIndex === features.length - 1}
                          className="p-1 rounded text-gray-400 hover:text-amber-600 disabled:opacity-30 transition-colors" title="Xuống">
                          <ArrowDown size={13} />
                        </button>
                        <button type="button" onClick={() => removeFeature(featureIndex)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors" title="Xóa dòng">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors"
        >
          <Save size={14} />
          {saving ? "Đang lưu..." : "Lưu bảng so sánh"}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">✓ Đã lưu</span>}
      </div>
    </div>
  );
}
