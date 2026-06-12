"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface SubCategory {
  id: string;
  name: string;
  categoryName: string;
  displayOrder: number;
  isActive: boolean;
}

interface Props {
  categoryName: string;
}

export default function SubCategoryManager({ categoryName }: Props) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add form state
  const [addName, setAddName] = useState("");
  const [addOrder, setAddOrder] = useState(0);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sub-categories?category=${encodeURIComponent(categoryName)}`, { credentials: "include" });
      const json = await res.json() as { data?: SubCategory[]; error?: string };
      if (json.data) setSubs(json.data);
    } catch {
      setError("Không tải được danh mục con");
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => {
    if (open) void fetchSubs();
  }, [open, fetchSubs]);

  async function handleAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sub-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), categoryName, displayOrder: addOrder }),
      });
      const json = await res.json() as { data?: SubCategory; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Thêm thất bại"); return; }
      setSubs((prev) => [...prev, json.data!].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
      setAddName("");
      setAddOrder(subs.length);
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
    try {
      await fetch(`/api/admin/sub-categories/${sub.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sub.isActive }),
      });
      setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, isActive: !s.isActive } : s));
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá danh mục con này? Seller đã đăng ký sẽ mất liên kết.")) return;
    try {
      await fetch(`/api/admin/sub-categories/${id}`, { method: "DELETE", credentials: "include" });
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } catch { /* silent */ }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Ẩn danh mục con" : "Quản lý danh mục con"}
        {!loading && !open && (
          <span className="ml-1 text-gray-400">— {subs.length > 0 ? `${subs.length} mục` : "chưa có"}</span>
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          {/* Existing subs */}
          {loading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : subs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có danh mục con.</p>
          ) : (
            <div className="space-y-1.5">
              {subs.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                  {editId === sub.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 text-sm border border-violet-300 rounded px-2 py-1 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") void handleSaveEdit(sub.id); if (e.key === "Escape") setEditId(null); }}
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
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm font-medium ${sub.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                        {sub.name}
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-center">{sub.displayOrder}</span>
                      <button
                        title={sub.isActive ? "Ẩn" : "Hiện"}
                        onClick={() => void handleToggleActive(sub)}
                        className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${sub.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      >
                        {sub.isActive ? "Hiện" : "Ẩn"}
                      </button>
                      <button
                        onClick={() => { setEditId(sub.id); setEditName(sub.name); setEditOrder(sub.displayOrder); }}
                        className="text-gray-400 hover:text-violet-600"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => void handleDelete(sub.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex items-center gap-2 pt-1">
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
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding || !addName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={12} /> Thêm
            </button>
          </div>
          <p className="text-[10px] text-gray-400">Ô số = thứ tự hiển thị (nhỏ hơn → hiển thị trước)</p>
        </div>
      )}
    </div>
  );
}
