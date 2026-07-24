"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, PackageOpen, Star } from "lucide-react";

interface Variant {
  id: string;
  variantName: string | null;
  variantPrice: number;
  warranty: string;
  isActive: boolean;
  isPopular?: boolean;
  createdAt: string;
}

interface VariantForm {
  variantPrice: string;
  warranty: string;
}

const EMPTY_FORM: VariantForm = { variantPrice: "", warranty: "" };

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function variantLabel(v: Variant, index: number) {
  return v.variantName?.trim() ? v.variantName : `Gói ${index + 1}`;
}

export interface VariantManagerProps {
  productId: string;
  /** Nếu là admin/staff — hiện nút toggle isActive */
  isAdmin?: boolean;
  /** Base API path, default: /api/seller/products */
  apiBase?: string;
  /** Cho phép chọn 1 gói làm "Phổ biến" (dùng cho Tool - Phần mềm) */
  showPopularToggle?: boolean;
}

export default function VariantManager({ productId, isAdmin = false, apiBase = "/api/seller/products", showPopularToggle = false }: VariantManagerProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<VariantForm>(EMPTY_FORM);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VariantForm>(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const baseUrl = `${apiBase}/${productId}/variants`;

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(baseUrl, { credentials: "include" });
      const json = await res.json() as { success?: boolean; data?: Variant[]; error?: string };
      if (!res.ok || !json.success) { setError(json.error ?? "Không tải được biến thể"); return; }
      setVariants(json.data ?? []);
    } catch {
      setError("Lỗi kết nối mạng");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { void fetchVariants(); }, [fetchVariants]);

  function validateForm(f: VariantForm): string | null {
    const price = parseInt(f.variantPrice, 10);
    if (isNaN(price) || price <= 0) return "Giá phải là số nguyên dương";
    if (!f.warranty.trim()) return "Bảo hành không được trống";
    if (f.warranty.trim().length > 50) return "Bảo hành tối đa 50 ký tự";
    return null;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm(addForm);
    if (err) { setAddError(err); return; }
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantPrice: parseInt(addForm.variantPrice, 10),
          warranty: addForm.warranty.trim(),
        }),
      });
      const json = await res.json() as { success?: boolean; data?: Variant; error?: string };
      if (!res.ok || !json.success) { setAddError(json.error ?? "Thêm biến thể thất bại"); return; }
      setVariants((v) => [...v, json.data!]);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
    } catch {
      setAddError("Lỗi kết nối mạng");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(v: Variant) {
    setEditId(v.id);
    setEditForm({ variantPrice: String(v.variantPrice), warranty: v.warranty });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const err = validateForm(editForm);
    if (err) { setEditError(err); return; }
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`${baseUrl}/${editId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantPrice: parseInt(editForm.variantPrice, 10),
          warranty: editForm.warranty.trim(),
        }),
      });
      const json = await res.json() as { success?: boolean; data?: Variant; error?: string };
      if (!res.ok || !json.success) { setEditError(json.error ?? "Cập nhật thất bại"); return; }
      setVariants((vs) => vs.map((v) => (v.id === editId ? { ...v, ...json.data! } : v)));
      setEditId(null);
    } catch {
      setEditError("Lỗi kết nối mạng");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(variantId: string, current: boolean) {
    const res = await fetch(`${baseUrl}/${variantId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    const json = await res.json() as { success?: boolean; data?: Variant };
    if (res.ok && json.success && json.data) {
      setVariants((vs) => vs.map((v) => (v.id === variantId ? { ...v, isActive: json.data!.isActive } : v)));
    }
  }

  async function handleTogglePopular(variantId: string, current: boolean) {
    const res = await fetch(`${baseUrl}/${variantId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPopular: !current }),
    });
    if (res.ok) void fetchVariants();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${baseUrl}/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) { setDeleteId(null); return; }
      setVariants((vs) => vs.filter((v) => v.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  const deleteTarget = variants.find((v) => v.id === deleteId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Gói sản phẩm</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Quản lý gói sản phẩm.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAdd((s) => !s); setAddError(""); setAddForm(EMPTY_FORM); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${
            isAdmin ? "bg-violet-600 hover:bg-violet-700" : "bg-primary hover:bg-[#0052cc]"
          }`}
        >
          {showAdd ? <X size={12} /> : <Plus size={12} />}
          {showAdd ? "Đóng" : "Thêm gói sản phẩm"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-violet-700">Gói mới</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Giá (VNĐ) *</label>
              <input
                type="number"
                value={addForm.variantPrice}
                onChange={(e) => setAddForm((f) => ({ ...f, variantPrice: e.target.value }))}
                min={1}
                step={1}
                placeholder="VD: 50000"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Mô tả gói</label>
              <input
                type="text"
                value={addForm.warranty}
                onChange={(e) => setAddForm((f) => ({ ...f, warranty: e.target.value }))}
                maxLength={50}
                placeholder="VD: 12 tháng"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addLoading}
              className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60 transition-colors ${
                isAdmin ? "bg-violet-600 hover:bg-violet-700" : "bg-primary hover:bg-[#0052cc]"
              }`}
            >
              {addLoading ? "Đang lưu..." : "Thêm"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); setAddError(""); }}
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
          <PackageOpen size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Chưa có gói nào</p>
          <p className="text-xs text-gray-300 mt-1">Nhấn "+ Thêm gói" để bắt đầu</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Gói</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Giá</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bảo hành</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>}
                  {showPopularToggle && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Phổ biến</th>}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50/60 transition-colors`}>
                    {editId === v.id ? (
                      <td colSpan={4 + (isAdmin ? 1 : 0) + (showPopularToggle ? 1 : 0)} className="px-4 py-3">
                        <form onSubmit={handleEdit} className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={editForm.variantPrice}
                              onChange={(e) => setEditForm((f) => ({ ...f, variantPrice: e.target.value }))}
                              min={1}
                              step={1}
                              placeholder="Giá (VNĐ)"
                              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editForm.warranty}
                              onChange={(e) => setEditForm((f) => ({ ...f, warranty: e.target.value }))}
                              maxLength={50}
                              placeholder="Bảo hành"
                              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
                            />
                          </div>
                          {editError && <p className="text-xs text-red-500">{editError}</p>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={editLoading}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
                              <Check size={11} />
                              {editLoading ? "Lưu..." : "Lưu"}
                            </button>
                            <button type="button" onClick={() => setEditId(null)}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                              <X size={11} /> Hủy
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{variantLabel(v, i)}</span>
                          {!v.isActive && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400 border border-gray-200">
                              Tắt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-emerald-700">{formatVnd(v.variantPrice)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{v.warranty}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(v.id, v.isActive)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                                v.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              }`}
                            >
                              {v.isActive ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                              {v.isActive ? "Đang bán" : "Tắt"}
                            </button>
                          </td>
                        )}
                        {showPopularToggle && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => void handleTogglePopular(v.id, !!v.isPopular)}
                              title={v.isPopular ? "Bỏ chọn phổ biến" : "Đặt làm phổ biến"}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
                                v.isPopular
                                  ? "bg-amber-100 border-amber-300 text-amber-600"
                                  : "bg-white border-gray-200 text-gray-300 hover:border-amber-300 hover:text-amber-400"
                              }`}
                            >
                              <Star size={14} fill={v.isPopular ? "currentColor" : "none"} />
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(v)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                              title="Sửa"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(v.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Xóa gói này?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {deleteTarget ? `${variantLabel(deleteTarget, variants.indexOf(deleteTarget))} · ${formatVnd(deleteTarget.variantPrice)}` : ""} — thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleDelete()}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteLoading ? "Đang xóa..." : "Xóa"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
