"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes, PenLine, Trash2, Package, BarChart2,
  CheckCircle, AlertTriangle, X,
} from "lucide-react";

interface Props {
  productId: string;
  productName: string;
  isRestricted: boolean;
  stockCount: number;
}

export default function ProductActions({ productId, productName, isRestricted, stockCount }: Props) {
  const router = useRouter();
  const [showStock, setShowStock] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [stockText, setStockText] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleAddStock() {
    const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setError("Vui lòng nhập ít nhất 1 item"); return; }
    setStockLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/products/${productId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
      const json = await res.json() as { data?: { addedCount?: number }; error?: string };
      if (!res.ok) { setError(json.error ?? "Thêm stock thất bại"); return; }
      setSuccess(`Đã thêm ${json.data?.addedCount ?? lines.length} items vào kho`);
      setStockText("");
      setTimeout(() => { setSuccess(""); setShowStock(false); router.refresh(); }, 1500);
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setStockLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/seller/products/${productId}`, { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Xóa thất bại"); setShowDelete(false); return; }
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mt-2">
        {/* Kho button */}
        <button
          onClick={() => { setShowStock(true); setError(""); setSuccess(""); }}
          disabled={isRestricted}
          title={`Còn ${stockCount} items trong kho`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Boxes size={11} /> Kho ({stockCount})
        </button>
        {/* Edit link */}
        <a
          href={`/san-pham/${productId}/sua`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-100 transition-colors"
        >
          <PenLine size={11} />
        </a>
        {/* Delete button */}
        <button
          onClick={() => setShowDelete(true)}
          disabled={isRestricted}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Add Stock Modal */}
      {showStock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => { if (!stockLoading) setShowStock(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Boxes size={15} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Quản lý kho hàng</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">{productName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowStock(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <BarChart2 size={15} className="text-blue-500 shrink-0" />
                <p className="text-sm text-blue-800">
                  Đang còn <strong>{stockCount} items</strong> trong kho
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700">{success}</p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Thêm items mới (mỗi dòng 1 item)
                </label>
                <textarea
                  ref={textareaRef}
                  value={stockText}
                  onChange={(e) => { setStockText(e.target.value); setError(""); }}
                  rows={8}
                  placeholder={"item1@gmail.com:pass123\nitem2@gmail.com:pass456\n..."}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 font-mono placeholder:text-gray-400 focus:border-blue-400 focus:outline-none resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {stockText.split("\n").filter((l) => l.trim()).length} items sẽ được thêm
                </p>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowStock(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleAddStock}
                disabled={stockLoading || !stockText.trim()}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package size={14} />
                {stockLoading ? "Đang thêm..." : "Thêm vào kho"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowDelete(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Xóa sản phẩm?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-1 truncate">&quot;{productName}&quot;</p>
            <p className="text-xs text-gray-400 mb-5">Hành động này không thể hoàn tác.</p>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                <Trash2 size={14} />
                {deleteLoading ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
