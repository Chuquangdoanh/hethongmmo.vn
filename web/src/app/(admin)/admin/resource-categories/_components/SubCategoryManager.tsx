"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, Check, X, Package, Wrench } from "lucide-react";

interface SubCategory {
  id: string;
  name: string;
  categoryName: string;
  displayOrder: number;
  isActive: boolean;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
  showInToolPhanMem: boolean;
}

// Kho Tài Nguyên đã gộp chung với Nguyên Liệu MMO ở trang public — chỉ còn 2 khu vực quản lý
type ParentStore = "nguyen-lieu" | "tool";

interface Props {
  categoryName: string;
  parentStore: ParentStore;
  initialCount?: number;
  initialSubs?: SubCategory[];
  expanded?: boolean;
  onToggle?: () => void;
}

const SUB_STORE_META: Record<ParentStore, { label: string; shortLabel: string; Icon: typeof Package; badgeClass: string; fields: (keyof SubCategory)[] }> = {
  "nguyen-lieu": { label: "Nguyên Liệu MMO", shortLabel: "NL",   Icon: Package, badgeClass: "bg-violet-100 text-violet-600", fields: ["showInTaiNguyenMmo", "showInKhoTaiNguyen"] },
  tool:          { label: "Tool - Phần mềm", shortLabel: "Tool", Icon: Wrench,  badgeClass: "bg-amber-100 text-amber-600",  fields: ["showInToolPhanMem"] },
};

function subStoreMatches(sub: SubCategory, k: ParentStore): boolean {
  return SUB_STORE_META[k].fields.some((f) => sub[f]);
}

function SubStoreBadge({ sub }: { sub: SubCategory }) {
  const active = (Object.keys(SUB_STORE_META) as ParentStore[]).filter((k) => subStoreMatches(sub, k));
  if (active.length > 1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded bg-gray-100 text-gray-500">
        {active.map((k) => { const Icon = SUB_STORE_META[k].Icon; return <Icon key={k} size={8} />; })}
      </span>
    );
  }
  const only = active[0] ? SUB_STORE_META[active[0]] : null;
  if (!only) return null;
  const Icon = only.Icon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded ${only.badgeClass}`}>
      <Icon size={8} /> {only.shortLabel}
    </span>
  );
}

export default function SubCategoryManager({
  categoryName,
  parentStore,
  initialCount,
  initialSubs,
  expanded,
  onToggle,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = expanded !== undefined && onToggle !== undefined;
  const open = isControlled ? expanded : internalOpen;

  function handleToggle() {
    if (isControlled) onToggle?.();
    else setInternalOpen((v) => !v);
  }

  const [subs, setSubs] = useState<SubCategory[]>(initialSubs ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(initialSubs !== undefined);

  const [addName, setAddName] = useState("");
  const [addOrder, setAddOrder] = useState(0);
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Chỉ hiển thị sub thuộc khu vực đang xem
  const visibleSubs = subs.filter((s) => subStoreMatches(s, parentStore));

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/sub-categories?category=${encodeURIComponent(categoryName)}`,
        { credentials: "include" },
      );
      const json = await res.json() as { data?: SubCategory[]; error?: string };
      if (json.data) { setSubs(json.data); setSynced(true); }
    } catch {
      setError("Không tải được danh mục con");
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => {
    if (open && !synced) void fetchSubs();
  }, [open, synced, fetchSubs]);

  async function handleAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sub-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          categoryName,
          displayOrder: addOrder,
          // Khu vực của con tự động khớp với cha
          showInKhoTaiNguyen: parentStore === "nguyen-lieu",
          showInTaiNguyenMmo: parentStore === "nguyen-lieu",
          showInToolPhanMem: parentStore === "tool",
        }),
      });
      const json = await res.json() as { data?: SubCategory; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Thêm thất bại"); return; }
      setSubs((prev) =>
        [...prev, json.data!].sort(
          (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
        )
      );
      setAddName("");
      setAddOrder(visibleSubs.length);
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sub-categories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), displayOrder: editOrder }),
      });
      const json = await res.json() as { data?: SubCategory; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Lưu thất bại"); return; }
      setSubs((prev) => prev.map((s) => s.id === id ? json.data! : s));
      setEditId(null);
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(sub: SubCategory) {
    const newVal = !sub.isActive;
    try {
      const res = await fetch(`/api/admin/sub-categories/${sub.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newVal }),
      });
      if (res.ok) {
        setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, isActive: newVal } : s));
      }
    } catch { /* silent */ }
  }

  async function confirmDelete(id: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/admin/sub-categories/${id}`, { method: "DELETE", credentials: "include" });
      setSubs((prev) => prev.filter((s) => s.id !== id));
      setDeletingSubId(null);
    } catch { /* silent */ } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Ẩn danh mục con" : "Quản lý danh mục con"}
        {!open && (
          <span className="ml-1 text-gray-400">
            — {visibleSubs.length > 0
              ? `${visibleSubs.length} mục`
              : synced ? "chưa có" : (initialCount ?? 0) > 0 ? "..." : "chưa có"}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          {loading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : visibleSubs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có danh mục con trong kho này.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleSubs.map((sub) => (
                <div key={sub.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                  {editId === sub.id ? (
                    /* ── Edit row ── */
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 text-sm border border-violet-300 rounded px-2 py-1 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit(sub.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                      <input
                        type="number"
                        value={editOrder}
                        onChange={(e) => setEditOrder(Number(e.target.value))}
                        className="w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none text-center"
                        min={0}
                      />
                      <button onClick={() => void handleSaveEdit(sub.id)} disabled={saving} className="text-emerald-600 hover:text-emerald-700">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : deletingSubId === sub.id ? (
                    /* ── Inline delete confirm ── */
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-xs text-red-700 font-medium truncate">
                        Xóa &ldquo;{sub.name}&rdquo;?
                      </p>
                      <button
                        onClick={() => setDeletingSubId(null)}
                        disabled={deleteLoading}
                        className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => void confirmDelete(sub.id)}
                        disabled={deleteLoading}
                        className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        {deleteLoading ? "..." : "Xóa"}
                      </button>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div className="flex items-center gap-2">
                      <SubStoreBadge sub={sub} />
                      <span className={`flex-1 text-sm font-medium truncate ${sub.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                        {sub.name}
                      </span>
                      <span className="text-xs text-gray-400 w-6 text-center shrink-0">{sub.displayOrder}</span>
                      <button
                        title={sub.isActive ? "Ẩn" : "Hiện"}
                        onClick={() => void handleToggleActive(sub)}
                        className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors shrink-0 ${
                          sub.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {sub.isActive ? "Hiện" : "Ẩn"}
                      </button>
                      <button
                        onClick={() => { setEditId(sub.id); setEditName(sub.name); setEditOrder(sub.displayOrder); }}
                        className="text-gray-400 hover:text-violet-600 shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletingSubId(sub.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Thêm mới — kho tự động khớp cha */}
          <div className="space-y-2 pt-1 border-t border-violet-100">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 font-medium">Thêm danh mục con mới:</p>
              <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded ${SUB_STORE_META[parentStore].badgeClass}`}>
                {(() => { const Icon = SUB_STORE_META[parentStore].Icon; return <><Icon size={8} /> {SUB_STORE_META[parentStore].label}</>; })()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Tên danh mục con..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400"
                onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
              />
              <input
                type="number"
                value={addOrder}
                onChange={(e) => setAddOrder(Number(e.target.value))}
                className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-violet-400 text-center"
                min={0}
                title="Thứ tự hiển thị"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding || !addName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={12} /> Thêm
            </button>
            <p className="text-[10px] text-gray-400">Ô số = thứ tự hiển thị (nhỏ hơn → hiển thị trước)</p>
          </div>
        </div>
      )}
    </div>
  );
}
