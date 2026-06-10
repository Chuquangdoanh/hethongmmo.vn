"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, Check, AlertCircle, ChevronDown, ChevronUp, Trophy, X } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";
import type { SellerTierDefinition } from "@prisma/client";

// ─── Color map ────────────────────────────────────────────────────────────────

const BADGE_COLORS = ["gray", "slate", "amber", "violet", "blue", "green", "red", "pink", "orange", "teal"] as const;
type BadgeColor = (typeof BADGE_COLORS)[number];

const COLOR_STYLE: Record<string, { ring: string; bg: string; dot: string; badge: string; badgeText: string }> = {
  gray:   { ring: "border-gray-200",   bg: "bg-gray-50",   dot: "bg-gray-400",   badge: "bg-gray-100",   badgeText: "text-gray-700"   },
  slate:  { ring: "border-slate-300",  bg: "bg-slate-50",  dot: "bg-slate-500",  badge: "bg-slate-100",  badgeText: "text-slate-700"  },
  amber:  { ring: "border-amber-300",  bg: "bg-amber-50",  dot: "bg-amber-500",  badge: "bg-amber-100",  badgeText: "text-amber-700"  },
  violet: { ring: "border-violet-300", bg: "bg-violet-50", dot: "bg-violet-500", badge: "bg-violet-100", badgeText: "text-violet-700" },
  blue:   { ring: "border-blue-300",   bg: "bg-blue-50",   dot: "bg-blue-500",   badge: "bg-blue-100",   badgeText: "text-blue-700"   },
  green:  { ring: "border-green-300",  bg: "bg-green-50",  dot: "bg-green-500",  badge: "bg-green-100",  badgeText: "text-green-700"  },
  red:    { ring: "border-red-300",    bg: "bg-red-50",    dot: "bg-red-500",    badge: "bg-red-100",    badgeText: "text-red-700"    },
  pink:   { ring: "border-pink-300",   bg: "bg-pink-50",   dot: "bg-pink-500",   badge: "bg-pink-100",   badgeText: "text-pink-700"   },
  orange: { ring: "border-orange-300", bg: "bg-orange-50", dot: "bg-orange-500", badge: "bg-orange-100", badgeText: "text-orange-700" },
  teal:   { ring: "border-teal-300",   bg: "bg-teal-50",   dot: "bg-teal-500",   badge: "bg-teal-100",   badgeText: "text-teal-700"   },
};
const getStyle = (c: string) => COLOR_STYLE[c] ?? COLOR_STYLE["gray"]!;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = SellerTierDefinition & { benefits: string[] };

interface EditState {
  label: string;
  description: string;
  badgeColor: BadgeColor;
  feePercent: number;
  minWithdrawal: number;
  holdDays: number;
  benefits: string[];
  upgradeMinRevenue: number;
  upgradeMinOrders: number;
  displayOrder: number;
  isActive: boolean;
}

function toEditState(t: Tier): EditState {
  return {
    label:             t.label,
    description:       t.description ?? "",
    badgeColor:        (t.badgeColor as BadgeColor) ?? "gray",
    feePercent:        t.feePercent,
    minWithdrawal:     t.minWithdrawal,
    holdDays:          t.holdDays,
    benefits:          t.benefits,
    upgradeMinRevenue: t.upgradeMinRevenue,
    upgradeMinOrders:  t.upgradeMinOrders,
    displayOrder:      t.displayOrder,
    isActive:          t.isActive,
  };
}

const BLANK_NEW: Omit<EditState, "displayOrder"> & { key: string } = {
  key: "", label: "", description: "", badgeColor: "gray",
  feePercent: 5, minWithdrawal: 200_000, holdDays: 3,
  benefits: [], upgradeMinRevenue: 0, upgradeMinOrders: 0, isActive: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerTierManager({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers]         = useState<Tier[]>(initialTiers);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [edits, setEdits]         = useState<Record<string, EditState>>({});
  const [newBenefit, setNewBenefit] = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [saved, setSaved]         = useState<Record<string, boolean>>({});
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newTier, setNewTier]     = useState({ ...BLANK_NEW });
  const [newBenefitInput, setNewBenefitInput] = useState("");
  const [, startTransition]       = useTransition();

  // ── Edit helpers ──
  function getEdit(id: string, tier: Tier): EditState {
    return edits[id] ?? toEditState(tier);
  }

  function setField<K extends keyof EditState>(id: string, tier: Tier, field: K, val: EditState[K]) {
    setEdits((e) => ({ ...e, [id]: { ...getEdit(id, tier), [field]: val } }));
    setSaved((s) => ({ ...s, [id]: false }));
  }

  function addBenefit(id: string, tier: Tier) {
    const text = (newBenefit[id] ?? "").trim();
    if (!text) return;
    const cur = getEdit(id, tier);
    setField(id, tier, "benefits", [...cur.benefits, text]);
    setNewBenefit((b) => ({ ...b, [id]: "" }));
  }

  function removeBenefit(id: string, tier: Tier, i: number) {
    const cur = getEdit(id, tier);
    setField(id, tier, "benefits", cur.benefits.filter((_, j) => j !== i));
  }

  // ── Save existing tier ──
  async function saveTier(tier: Tier) {
    const data = edits[tier.id] ?? toEditState(tier);
    setSaving((s) => ({ ...s, [tier.id]: true }));
    setErrors((e) => ({ ...e, [tier.id]: "" }));
    try {
      const res = await fetch(`/api/admin/seller-tier-definitions/${tier.id}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data?: Tier; error?: string };
      if (!res.ok) { setErrors((e) => ({ ...e, [tier.id]: json.error ?? "Lỗi" })); return; }
      setTiers((ts) => ts.map((t) => t.id === tier.id ? { ...t, ...data } : t));
      setSaved((s) => ({ ...s, [tier.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [tier.id]: false })), 3000);
    } finally {
      setSaving((s) => ({ ...s, [tier.id]: false }));
    }
  }

  // ── Delete tier ──
  async function deleteTier(tier: Tier) {
    if (!confirm(`Xóa hạng "${tier.label}"? Seller đang ở hạng này sẽ được chuyển về STANDARD.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/seller-tier-definitions/${tier.id}`, { credentials: "include", method: "DELETE" });
      if (res.ok) setTiers((ts) => ts.filter((t) => t.id !== tier.id));
    });
  }

  // ── Create new tier ──
  async function createTier() {
    const res = await fetch("/api/admin/seller-tier-definitions", { credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTier, displayOrder: tiers.length }),
    });
    const json = await res.json() as { data?: Tier; error?: string };
    if (!res.ok) { alert(json.error ?? "Tạo thất bại"); return; }
    setTiers((ts) => [...ts, json.data!]);
    setNewTier({ ...BLANK_NEW });
    setNewBenefitInput("");
    setShowCreate(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} strokeWidth={2} className="text-amber-500" />
          <h2 className="text-sm font-bold text-gray-900">Hạng nhà bán hàng</h2>
          <span className="text-xs text-gray-400 ml-1">— bấm để chỉnh sửa</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} /> Thêm hạng mới
        </button>
      </div>

      {/* Tier list */}
      {tiers.map((tier) => {
        const style  = getStyle(tier.badgeColor);
        const isOpen = expanded === tier.id;
        const edit   = getEdit(tier.id, tier);

        return (
          <div key={tier.id} className={`rounded-xl border-2 transition-all ${style.ring} ${isOpen ? "shadow-md" : "shadow-sm"}`}>
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : tier.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors rounded-t-xl ${isOpen ? style.bg : "bg-white hover:bg-gray-50"}`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`} />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${style.badge} ${style.badgeText}`}>
                {tier.label}
              </span>
              {tier.isBuiltIn && <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">Built-in</span>}
              {!tier.isActive && <span className="text-[10px] text-red-500 border border-red-200 bg-red-50 rounded px-1">Ẩn</span>}
              <span className="flex-1 text-sm text-gray-500 truncate">{tier.description ?? "—"}</span>
              <span className="hidden sm:flex items-center gap-4 text-xs text-gray-500 shrink-0">
                <span>Phí <strong className="text-gray-800">{tier.feePercent}%</strong></span>
                <span>Tối thiểu <strong className="text-gray-800">{formatVnd(tier.minWithdrawal)}</strong></span>
                <span>Giữ <strong className="text-gray-800">{tier.holdDays}d</strong></span>
              </span>
              {saved[tier.id] && <Check size={14} className="text-green-500 shrink-0" />}
              {errors[tier.id] && <AlertCircle size={14} className="text-red-500 shrink-0" />}
              {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>

            {/* Edit panel */}
            {isOpen && (
              <div className={`px-5 pb-5 pt-2 ${style.bg} rounded-b-xl border-t border-gray-100`}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-3">

                  {/* Col 1: Display */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hiển thị</h4>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Tên hạng</label>
                      <input type="text" value={edit.label} maxLength={30}
                        onChange={(e) => setField(tier.id, tier, "label", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Mô tả</label>
                      <textarea value={edit.description} maxLength={200} rows={2}
                        onChange={(e) => setField(tier.id, tier, "description", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Màu badge</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BADGE_COLORS.map((c) => {
                          const s = getStyle(c);
                          return (
                            <button key={c} type="button"
                              onClick={() => setField(tier.id, tier, "badgeColor", c)}
                              className={`w-6 h-6 rounded-full ${s.dot} ring-2 transition-all ${edit.badgeColor === c ? "ring-gray-900 scale-110" : "ring-transparent"}`}
                              title={c}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">DT tối thiểu (đ)</label>
                        <input type="number" value={edit.upgradeMinRevenue} min={0} step={1_000_000}
                          onChange={(e) => setField(tier.id, tier, "upgradeMinRevenue", parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
                        <p className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>{formatVnd(edit.upgradeMinRevenue)}</p>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">Đơn tối thiểu</label>
                        <input type="number" value={edit.upgradeMinOrders} min={0}
                          onChange={(e) => setField(tier.id, tier, "upgradeMinOrders", parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={edit.isActive}
                        onChange={(e) => setField(tier.id, tier, "isActive", e.target.checked)}
                        className="rounded border-gray-300" />
                      Hiển thị hạng này
                    </label>
                  </div>

                  {/* Col 2: Withdrawal */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rút tiền</h4>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Phí rút (%)</label>
                      <input type="number" value={edit.feePercent} min={0} max={50} step={0.5}
                        onChange={(e) => setField(tier.id, tier, "feePercent", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Tối thiểu (đ)</label>
                      <input type="number" value={edit.minWithdrawal} min={0} step={10_000}
                        onChange={(e) => setField(tier.id, tier, "minWithdrawal", parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                      <p className="text-[10px] text-gray-400 mt-0.5" suppressHydrationWarning>{formatVnd(edit.minWithdrawal)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Giữ đơn (ngày)</label>
                      <input type="number" value={edit.holdDays} min={0} max={30}
                        onChange={(e) => setField(tier.id, tier, "holdDays", parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Thứ tự hiển thị</label>
                      <input type="number" value={edit.displayOrder} min={0}
                        onChange={(e) => setField(tier.id, tier, "displayOrder", parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                    </div>
                  </div>

                  {/* Col 3: Benefits */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đặc quyền</h4>
                    <div className="space-y-1.5">
                      {edit.benefits.length === 0 && <p className="text-xs text-gray-400 italic">Chưa có đặc quyền</p>}
                      {edit.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
                          <span className="flex-1 text-sm text-gray-700">{b}</span>
                          <button type="button" onClick={() => removeBenefit(tier.id, tier, i)}
                            className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newBenefit[tier.id] ?? ""} maxLength={100}
                        placeholder="Thêm đặc quyền…"
                        onChange={(e) => setNewBenefit((b) => ({ ...b, [tier.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(tier.id, tier); } }}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                      <button type="button" onClick={() => addBenefit(tier.id, tier)}
                        disabled={!(newBenefit[tier.id] ?? "").trim()}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-40 transition-colors">
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center gap-3 justify-between">
                  {!tier.isBuiltIn && (
                    <button type="button" onClick={() => deleteTier(tier)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
                      <Trash2 size={13} strokeWidth={2} /> Xóa hạng
                    </button>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                    {errors[tier.id] && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={13} /> {errors[tier.id]}
                      </span>
                    )}
                    {saved[tier.id] && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Check size={13} strokeWidth={2.5} /> Đã lưu
                      </span>
                    )}
                    <button type="button" onClick={() => saveTier(tier)} disabled={saving[tier.id]}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors">
                      <Save size={14} strokeWidth={2} />
                      {saving[tier.id] ? "Đang lưu…" : `Lưu hạng ${edit.label || tier.label}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Create new tier dialog ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Tạo hạng mới</h3>
              <button type="button" onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Key (viết hoa, không dấu) <span className="text-red-500">*</span></label>
                  <input type="text" value={newTier.key} maxLength={50} placeholder="VD: DIAMOND"
                    onChange={(e) => setNewTier((t) => ({ ...t, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
                  <input type="text" value={newTier.label} maxLength={30} placeholder="VD: Diamond"
                    onChange={(e) => setNewTier((t) => ({ ...t, label: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mô tả</label>
                <input type="text" value={newTier.description} maxLength={200}
                  onChange={(e) => setNewTier((t) => ({ ...t, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Màu badge</label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_COLORS.map((c) => {
                    const s = getStyle(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => setNewTier((t) => ({ ...t, badgeColor: c }))}
                        className={`w-6 h-6 rounded-full ${s.dot} ring-2 transition-all ${newTier.badgeColor === c ? "ring-gray-900 scale-110" : "ring-transparent"}`}
                        title={c}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Phí rút (%)</label>
                  <input type="number" value={newTier.feePercent} min={0} max={50} step={0.5}
                    onChange={(e) => setNewTier((t) => ({ ...t, feePercent: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tối thiểu (đ)</label>
                  <input type="number" value={newTier.minWithdrawal} min={0} step={10_000}
                    onChange={(e) => setNewTier((t) => ({ ...t, minWithdrawal: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Giữ đơn (ngày)</label>
                  <input type="number" value={newTier.holdDays} min={0} max={30}
                    onChange={(e) => setNewTier((t) => ({ ...t, holdDays: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                </div>
              </div>
              {/* Benefits */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Đặc quyền</label>
                <div className="space-y-1.5 mb-2">
                  {newTier.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-1.5">
                      <span className="flex-1 text-sm text-gray-700">{b}</span>
                      <button type="button"
                        onClick={() => setNewTier((t) => ({ ...t, benefits: t.benefits.filter((_, j) => j !== i) }))}
                        className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newBenefitInput} maxLength={100} placeholder="Thêm đặc quyền…"
                    onChange={(e) => setNewBenefitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const t = newBenefitInput.trim();
                        if (t) { setNewTier((n) => ({ ...n, benefits: [...n.benefits, t] })); setNewBenefitInput(""); }
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                  <button type="button"
                    onClick={() => { const t = newBenefitInput.trim(); if (t) { setNewTier((n) => ({ ...n, benefits: [...n.benefits, t] })); setNewBenefitInput(""); } }}
                    disabled={!newBenefitInput.trim()}
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button type="button" onClick={createTier}
                disabled={!newTier.key || !newTier.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors">
                <Plus size={14} strokeWidth={2.5} /> Tạo hạng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
