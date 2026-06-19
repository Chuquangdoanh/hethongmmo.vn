"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, Check, X, Warehouse, Package } from "lucide-react";

interface SubCategory {
  id: string;
  name: string;
  categoryName: string;
  displayOrder: number;
  isActive: boolean;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
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
  const [addKho, setAddKho] = useState(true);
  const [addMmo, setAddMmo] = useState(true);
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
        body: JSON.stringify({
          name: addName.trim(),
          categoryName,
          displayOrder: addOrder,
          showInKhoTaiNguyen: addKho,
          showInTaiNguyenMmo: addMmo,
        }),
      });
      const json = await res.json() as { data?: SubCategory; error?: string };
      if (!res.ok || !json.data) { setError(json.error ?? "Thêm thất bại"); return; }
      setSubs((prev) => [...prev, json.data!].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
      setAddName("");
      setAddOrder(subs.length);
      setAddKho(true);
      setAddMmo(true);
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

  async function handleToggleField(sub: SubCategory, field: "isActive" | "showInKhoTaiNguyen" | "showInTaiNguyenMmo") {
    const newVal = !sub[field];
    try {
      const res = await fetch(`/api/admin/sub-categories/${sub.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (res.ok) {
        setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, [field]: newVal } : s));
      }
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
                <div key={sub.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2 space-y-1.5">
                  {editId === sub.id ? (
                    <div className="flex items-center gap-2">
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
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 text-sm font-medium ${sub.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                        {sub.name}
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-center">{sub.displayOrder}</span>
                      <button
                        title={sub.isActive ? "Ẩn" : "Hiện"}
                        onClick={() => void handleToggleField(sub, "isActive")}
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
                    </div>
                  )}

                  {/* Store type toggles — always visible */}
                  <div className="flex gap-3 pl-0.5">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.showInKhoTaiNguyen}
                        onChange={() => void handleToggleField(sub, "showInKhoTaiNguyen")}
                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-600">
                        <Warehouse size={9} /> Kho TN
                      </span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.showInTaiNguyenMmo}
                        onChange={() => void handleToggleField(sub, "showInTaiNguyenMmo")}
                        className="w-3 h-3 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-violet-600">
                        <Package size={9} /> TN MMO
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="space-y-2 pt-1 border-t border-violet-100">
            <p className="text-[10px] text-gray-500 font-medium">Thêm danh mục con mới:</p>
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
            {/* Store type checkboxes for new sub */}
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addKho}
                  onChange={(e) => setAddKho(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
                  <Warehouse size={11} /> Kho Tài Nguyên
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addMmo}
                  onChange={(e) => setAddMmo(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 text-[11px] font-medium text-violet-600">
                  <Package size={11} /> Tài Nguyên MMO
                </span>
              </label>
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
