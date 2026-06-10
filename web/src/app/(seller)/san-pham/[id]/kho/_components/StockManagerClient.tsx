"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package, AlertTriangle, Pencil, Trash2,
  ChevronLeft, ChevronRight, CheckCircle,
  Upload, FileText, X,
} from "lucide-react";

type StockStatus = "AVAILABLE" | "SOLD" | "RESERVED";

interface StockItem {
  id: string;
  content: string;
  status: StockStatus;
  soldAt: string | null;
  createdAt: string;
}

interface Props {
  productId: string;
  isRestricted: boolean;
  initialItems: StockItem[];
  initialTotal: number;
  initialTotalPages: number;
  initialPage: number;
  initialStatus: string;
}

const STATUS_TABS = [
  { key: "AVAILABLE", label: "Còn hàng" },
] as const;

const STATUS_BADGE: Record<StockStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOLD:      "bg-blue-50 text-blue-700 border-blue-200",
  RESERVED:  "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_LABEL: Record<StockStatus, string> = {
  AVAILABLE: "Còn hàng",
  SOLD:      "Đã bán",
  RESERVED:  "Đang giữ",
};

export default function StockManagerClient({
  productId,
  isRestricted,
  initialItems,
  initialTotal,
  initialTotalPages,
  initialPage,
  initialStatus,
}: Props) {
  const router = useRouter();

  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(initialPage);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState("");

  // ── TXT upload state ──────────────────────────────────────────────
  const txtInputRef = useRef<HTMLInputElement>(null);
  const [txtItems, setTxtItems] = useState<string[]>([]);
  const [txtFileName, setTxtFileName] = useState("");
  const [txtUploading, setTxtUploading] = useState(false);
  const [txtResult, setTxtResult] = useState<{ added: number; failed: number } | null>(null);
  const [txtError, setTxtError] = useState("");

  const fetchPage = useCallback(async (status: string, p: number) => {
    setLoading(true);
    setItems([]);
    setFetchError("");
    try {
      const qs = new URLSearchParams({ status, page: String(p) });
      const res = await fetch(`/api/seller/products/${productId}/stock?${qs}`, { credentials: "include" });
      const json = await res.json() as {
        data?: { items: StockItem[]; total: number; totalPages: number; page: number };
        error?: string;
      };
      if (!res.ok) {
        setFetchError(json.error ?? "Không thể tải dữ liệu");
        return;
      }
      if (json.data) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
        setPage(json.data.page);
      }
    } catch {
      setFetchError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  function handleTabChange(status: string) {
    setActiveStatus(status);
    setEditingId(null);
    void fetchPage(status, 1);
  }

  function handlePageChange(p: number) {
    setEditingId(null);
    void fetchPage(activeStatus, p);
  }

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setEditValue(item.content);
    setSaveError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setSaveError("");
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) { setSaveError("Nội dung không được trống"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/seller/products/${productId}/stock/${id}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editValue.trim() }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setSaveError(json.error ?? "Lưu thất bại"); return; }
      setItems((prev) => prev.map((item) =>
        item.id === id ? { ...item, content: editValue.trim() } : item
      ));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa item này khỏi kho?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/seller/products/${productId}/stock/${id}`, { credentials: "include", method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const offset = (page - 1) * 30;

  // ── TXT handlers ─────────────────────────────────────────────────
  function handleTxtSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTxtFileName(file.name);
    setTxtResult(null);
    setTxtError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result ?? "") as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      setTxtItems(lines);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function clearTxt() {
    setTxtItems([]);
    setTxtFileName("");
    setTxtResult(null);
    setTxtError("");
  }

  async function handleTxtUpload() {
    if (txtItems.length === 0) return;
    setTxtUploading(true);
    setTxtError("");
    setTxtResult(null);
    const BATCH = 500;
    let added = 0;
    let failed = 0;
    try {
      for (let i = 0; i < txtItems.length; i += BATCH) {
        const batch = txtItems.slice(i, i + BATCH);
        const res = await fetch(`/api/seller/products/${productId}/stock`, { credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch }),
        });
        const json = await res.json() as { data?: { addedCount: number }; error?: string };
        if (res.ok && json.data) {
          added += json.data.addedCount;
        } else {
          failed += batch.length;
        }
      }
      setTxtResult({ added, failed });
      setTxtItems([]);
      setTxtFileName("");
      setTotal((t) => t + added);
      void fetchPage("AVAILABLE", 1);
      router.refresh();
    } catch {
      setTxtError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setTxtUploading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Upload TXT ─────────────────────────────────────── */}
      {!isRestricted && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} className="text-violet-600 shrink-0" />
            <p className="text-sm font-semibold text-violet-800">Thêm kho từ file TXT</p>
            <span className="text-[10px] text-violet-500 ml-1">(mỗi dòng = 1 item)</span>
          </div>

          {/* Result banner */}
          {txtResult && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${
              txtResult.failed === 0
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}>
              <CheckCircle size={13} />
              Đã thêm <strong>{txtResult.added.toLocaleString("vi-VN")}</strong> item
              {txtResult.failed > 0 && <> · <span className="text-red-500">{txtResult.failed} thất bại</span></>}
            </div>
          )}

          {txtError && (
            <p className="text-xs text-red-500 mb-3">{txtError}</p>
          )}

          {txtItems.length > 0 ? (
            /* Preview + confirm */
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-violet-200">
                <FileText size={13} className="text-violet-400 shrink-0" />
                <span className="text-xs text-gray-700 flex-1 truncate">{txtFileName}</span>
                <span className="text-xs font-bold text-violet-700 shrink-0">
                  {txtItems.length.toLocaleString("vi-VN")} dòng
                </span>
                <button onClick={clearTxt} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={13} />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleTxtUpload()}
                  disabled={txtUploading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
                >
                  <Upload size={12} />
                  {txtUploading
                    ? `Đang upload... (${txtItems.length.toLocaleString("vi-VN")} items)`
                    : `Upload ${txtItems.length.toLocaleString("vi-VN")} items`}
                </button>
                <button
                  onClick={clearTxt}
                  disabled={txtUploading}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:border-gray-300 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            /* Drop zone */
            <div>
              <input
                ref={txtInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleTxtSelect}
              />
              <button
                onClick={() => txtInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-violet-300 bg-white py-6 text-center hover:border-violet-500 hover:bg-violet-50/50 transition-colors"
              >
                <Upload size={20} className="text-violet-400" />
                <p className="text-xs text-violet-600 font-medium">Click để chọn file .txt</p>
                <p className="text-[10px] text-gray-400">Mỗi dòng một item · Tối đa không giới hạn (upload theo batch 500)</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              activeStatus === key
                ? "bg-violet-600 text-white border-violet-600"
                : "border-gray-200 text-gray-500 hover:border-violet-400 hover:text-gray-900 bg-white"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400" suppressHydrationWarning>{total.toLocaleString("vi-VN")} item</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Đang tải...</div>
        ) : fetchError ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <span className="text-sm text-red-400">{fetchError}</span>
            <button onClick={() => void fetchPage(activeStatus, page)} className="mt-3 text-xs text-violet-600 hover:underline">Thử lại</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Package size={22} className="text-gray-400" />
            </div>
            <span className="text-sm">Không có item nào</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-12">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500">Nội dung</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-28">Trạng thái</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-36 hidden md:table-cell">Ngày thêm</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-36 hidden md:table-cell">Ngày bán</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{offset + i + 1}</td>

                  {/* Content cell */}
                  <td className="px-4 py-3 max-w-0">
                    {editingId === item.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-mono text-gray-800 focus:border-violet-500 focus:outline-none resize-none"
                          autoFocus
                        />
                        {saveError && <p className="text-[10px] text-red-500">{saveError}</p>}
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-gray-700 break-all line-clamp-2">
                        {item.content}
                      </p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>

                  {/* Dates */}
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{item.createdAt}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{item.soldAt ?? "—"}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {item.status === "AVAILABLE" && !isRestricted ? (
                      editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => void saveEdit(item.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle size={11} /> {saving ? "..." : "Lưu"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 text-[11px] hover:border-gray-300 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-200 text-violet-600 text-[11px] font-medium hover:bg-violet-50 transition-colors whitespace-nowrap"
                          >
                            <Pencil size={10} /> Sửa
                          </button>
                          <button
                            onClick={() => void handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 text-red-500 text-[11px] font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={10} /> {deletingId === item.id ? "..." : "Xóa"}
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={13} /> Trước
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1
              : page <= 4 ? i + 1
              : page >= totalPages - 3 ? totalPages - 6 + i
              : page - 3 + i;
            return (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  p === page
                    ? "bg-violet-600 text-white border border-violet-600"
                    : "border border-gray-200 text-gray-500 hover:border-violet-400 hover:text-gray-900"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-colors"
          >
            Tiếp <ChevronRight size={13} />
          </button>
          <span className="text-xs text-gray-400 ml-2">Trang {page}/{totalPages}</span>
        </div>
      )}
    </div>
  );
}
