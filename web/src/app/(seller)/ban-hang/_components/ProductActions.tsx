"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Boxes, PenLine, Trash2, Package,
  CheckCircle, AlertTriangle, X,
} from "lucide-react";

interface Props {
  productId: string;
  productName: string;
  isRestricted: boolean;
  stockCount: number;
}

// ─── StockModal ───────────────────────────────────────────────────────────────
function StockModal({
  productId, productName, stockCount, onClose,
}: {
  productId: string;
  productName: string;
  stockCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stockText, setStockText] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll lock + ESC
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !stockLoading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, stockLoading]);

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
      setTimeout(() => { setSuccess(""); onClose(); router.refresh(); }, 1500);
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setStockLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !stockLoading) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div
          className="relative px-5 pt-4 pb-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
        >
          <button
            onClick={onClose}
            disabled={stockLoading}
            aria-label="Đóng"
            style={{ touchAction: "manipulation" }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/35 transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
          <h3 className="text-white font-bold text-[16px] leading-tight tracking-wide uppercase pr-9">
            QUẢN LÝ KHO HÀNG
          </h3>
          <p className="text-white/70 text-[11px] mt-0.5 mb-3 truncate max-w-xs">
            {productName}
          </p>
          <div className="flex items-center rounded-xl bg-white/15 px-4 py-2.5">
            <Boxes size={14} className="text-white/90 shrink-0 mr-2" />
            <span className="text-white text-[13px] font-semibold">
              Đang còn {stockCount} items trong kho
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={stockLoading}
            style={{ touchAction: "manipulation" }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleAddStock}
            disabled={stockLoading || !stockText.trim()}
            style={{ touchAction: "manipulation" }}
            className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Package size={14} />
            {stockLoading ? "Đang thêm..." : "Thêm vào kho"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  productName, onClose, onConfirm, loading, error,
}: {
  productName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
}) {
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, loading]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
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
            onClick={onClose}
            disabled={loading}
            style={{ touchAction: "manipulation" }}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ touchAction: "manipulation" }}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            <Trash2 size={14} />
            {loading ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProductActions ───────────────────────────────────────────────────────────
export default function ProductActions({ productId, productName, isRestricted, stockCount }: Props) {
  const router = useRouter();
  const [showStock, setShowStock] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/seller/products/${productId}`, { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setDeleteError(json.error ?? "Xóa thất bại"); return; }
      router.refresh();
    } catch {
      setDeleteError("Có lỗi xảy ra");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {isMounted && showStock && createPortal(
        <StockModal
          productId={productId}
          productName={productName}
          stockCount={stockCount}
          onClose={() => setShowStock(false)}
        />,
        document.body,
      )}
      {isMounted && showDelete && createPortal(
        <DeleteConfirm
          productName={productName}
          onClose={() => { if (!deleteLoading) { setShowDelete(false); setDeleteError(""); } }}
          onConfirm={handleDelete}
          loading={deleteLoading}
          error={deleteError}
        />,
        document.body,
      )}

      <div className="flex items-center gap-1.5 mt-2">
        <button
          onClick={() => setShowStock(true)}
          disabled={isRestricted}
          title={`Còn ${stockCount} items trong kho`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Boxes size={11} /> Kho ({stockCount})
        </button>
        <a
          href={`/san-pham/${productId}/sua`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-100 transition-colors"
        >
          <PenLine size={11} />
        </a>
        <button
          onClick={() => { setShowDelete(true); setDeleteError(""); }}
          disabled={isRestricted}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </>
  );
}
