"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Boxes, PenLine, Trash2, Package,
  CheckCircle, AlertTriangle, X,
  FileText, Upload, Download, AlertCircle,
} from "lucide-react";

const MAX_IMPORT_ITEMS = 5000;
const MAX_FILE_SIZE_MB = 10;

interface Props {
  productId: string;
  productName: string;
  isRestricted: boolean;
  stockCount: number;
}

type DuplicateType = "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";

interface ImportError {
  line: number;
  value: string;
  type: DuplicateType;
  detail: string;
}

interface ImportResult {
  totalRows: number;
  validRows: number;
  insertedRows: number;
  duplicateInFile: number;
  duplicateInDatabase: number;
  totalErrors: number;
  errors: ImportError[];
}

const DUP_TYPE_LABEL: Record<DuplicateType, string> = {
  DUPLICATE_IN_FILE:     "Trùng file",
  DUPLICATE_IN_DATABASE: "Trùng kho",
};

const DUP_TYPE_CLASS: Record<DuplicateType, string> = {
  DUPLICATE_IN_FILE:     "bg-amber-50 text-amber-700 border-amber-200",
  DUPLICATE_IN_DATABASE: "bg-red-50 text-red-600 border-red-200",
};

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
  const txtInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"manual" | "file">("file");

  // Manual tab state
  const [stockText, setStockText] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // File tab state
  const [txtItems, setTxtItems] = useState<string[]>([]);
  const [txtFileName, setTxtFileName] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  // Shared state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const isLoading = manualLoading || fileLoading;

  // Scroll lock + ESC
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !isLoading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, isLoading]);

  async function submitItems(items: string[]) {
    const res = await fetch(`/api/seller/products/${productId}/stock`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json() as { data?: ImportResult; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Thêm stock thất bại");
    return json.data!;
  }

  async function handleManualSubmit() {
    const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setError("Vui lòng nhập ít nhất 1 item"); return; }
    if (lines.length > MAX_IMPORT_ITEMS) {
      setError(`Quá ${MAX_IMPORT_ITEMS.toLocaleString("vi-VN")} items. Hãy dùng Upload TXT cho số lượng lớn.`);
      return;
    }
    setManualLoading(true);
    setError("");
    setImportResult(null);
    try {
      const result = await submitItems(lines);
      setImportResult(result);
      setStockText("");
      if (result.insertedRows > 0) {
        setTimeout(() => router.refresh(), 800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setManualLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setImportResult(null);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File quá lớn. Tối đa ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result ?? "") as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) { setError("File không có nội dung hợp lệ."); return; }
      if (lines.length > MAX_IMPORT_ITEMS) {
        setError(`File có ${lines.length.toLocaleString("vi-VN")} dòng, vượt giới hạn ${MAX_IMPORT_ITEMS.toLocaleString("vi-VN")}.`);
        return;
      }
      setTxtFileName(file.name);
      setTxtItems(lines);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function clearFile() {
    setTxtItems([]);
    setTxtFileName("");
    setImportResult(null);
    setError("");
  }

  async function handleFileUpload() {
    if (txtItems.length === 0) return;
    setFileLoading(true);
    setError("");
    setImportResult(null);
    try {
      const result = await submitItems(txtItems);
      setImportResult(result);
      setTxtItems([]);
      setTxtFileName("");
      if (result.insertedRows > 0) {
        setTimeout(() => router.refresh(), 800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setFileLoading(false);
    }
  }

  function downloadErrors(errors: ImportError[]) {
    const header = "Dòng\tNội dung\tLoại lỗi\tMô tả";
    const rows = errors.map((e) => `${e.line}\t${e.value}\t${DUP_TYPE_LABEL[e.type]}\t${e.detail}`);
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const manualLineCount = stockText.split("\n").filter((l) => l.trim()).length;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-5 pt-4 pb-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng"
            style={{ touchAction: "manipulation" }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/35 transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
          <h3 className="text-white font-bold text-[16px] leading-tight tracking-wide uppercase pr-9">
            NHẬP HÀNG VÀO KHO
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

        {/* Tab selector */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => { setTab("file"); setImportResult(null); setError(""); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              tab === "file"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <FileText size={12} /> Upload TXT
          </button>
          <button
            onClick={() => { setTab("manual"); setImportResult(null); setError(""); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              tab === "manual"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Package size={12} /> Nhập tay
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Import result */}
          {importResult && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Stats */}
              <div className="grid grid-cols-5 divide-x divide-gray-100 text-center border-b border-gray-100">
                <StatCell label="Tổng" value={importResult.totalRows} />
                <StatCell label="Đã thêm" value={importResult.insertedRows} variant={importResult.insertedRows > 0 ? "green" : "gray"} />
                <StatCell label="Hợp lệ" value={importResult.validRows} />
                <StatCell label="Trùng file" value={importResult.duplicateInFile} variant={importResult.duplicateInFile > 0 ? "amber" : "gray"} />
                <StatCell label="Trùng kho" value={importResult.duplicateInDatabase} variant={importResult.duplicateInDatabase > 0 ? "red" : "gray"} />
              </div>
              {/* Summary */}
              {importResult.totalErrors === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle size={13} />
                  <span>Tất cả <strong>{importResult.insertedRows.toLocaleString("vi-VN")}</strong> item đã được thêm vào kho.</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <AlertCircle size={13} />
                    <span>
                      Thêm <strong>{importResult.insertedRows.toLocaleString("vi-VN")}</strong> item ·{" "}
                      bỏ qua <strong>{importResult.totalErrors.toLocaleString("vi-VN")}</strong> dòng lỗi
                    </span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <button
                      onClick={() => downloadErrors(importResult.errors)}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-gray-500 text-[10px] hover:border-gray-300 whitespace-nowrap"
                    >
                      <Download size={10} /> Tải lỗi
                    </button>
                  )}
                </div>
              )}
              {/* Error list */}
              {importResult.errors.length > 0 && (
                <div className="border-t border-gray-100 max-h-36 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-400 w-10">Dòng</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-400">Nội dung</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-400 w-20">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {importResult.errors.slice(0, 30).map((err, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 text-gray-400">{err.line}</td>
                          <td className="px-2 py-1 font-mono text-gray-600 max-w-0">
                            <span className="block truncate">{err.value}</span>
                          </td>
                          <td className="px-2 py-1">
                            <span className={`inline-flex px-1 py-0.5 rounded border text-[9px] font-semibold ${DUP_TYPE_CLASS[err.type]}`}>
                              {DUP_TYPE_LABEL[err.type]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importResult.errors.length > 30 && (
                    <p className="text-center text-[10px] text-gray-400 py-1.5 border-t border-gray-50">
                      ...và {(importResult.errors.length - 30).toLocaleString("vi-VN")} lỗi khác
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* ── Tab: Upload TXT ── */}
          {tab === "file" && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-400">
                Mỗi dòng = 1 item · Tối đa {MAX_IMPORT_ITEMS.toLocaleString("vi-VN")} dòng · UTF-8 · Max {MAX_FILE_SIZE_MB}MB
              </p>
              <p className="text-[11px] text-blue-600">
                Hệ thống tự động kiểm tra trùng lặp trong file và trong kho, chỉ thêm item hợp lệ.
              </p>

              {txtItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                    <FileText size={13} className="text-blue-400 shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{txtFileName}</span>
                    <span className="text-xs font-bold text-blue-700 shrink-0">
                      {txtItems.length.toLocaleString("vi-VN")} dòng
                    </span>
                    <button onClick={clearFile} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    ref={txtInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => txtInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 py-7 hover:border-blue-400 hover:bg-blue-50/60 transition-colors"
                  >
                    <Upload size={20} className="text-blue-400" />
                    <p className="text-xs text-blue-600 font-medium">Click để chọn file .txt</p>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Tab: Manual ── */}
          {tab === "manual" && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
                Thêm items mới (mỗi dòng 1 item)
              </label>
              <textarea
                value={stockText}
                onChange={(e) => { setStockText(e.target.value); setError(""); }}
                rows={8}
                placeholder={"item1@gmail.com:pass123\nitem2@gmail.com:pass456\n..."}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-800 font-mono placeholder:text-gray-400 focus:border-blue-400 focus:outline-none resize-none"
              />
              <p className="text-[11px] text-gray-400">
                {manualLineCount.toLocaleString("vi-VN")} items · Hệ thống sẽ bỏ qua trùng lặp
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ touchAction: "manipulation" }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {importResult ? "Đóng" : "Hủy"}
          </button>

          {tab === "file" && (
            txtItems.length > 0 ? (
              <button
                onClick={() => void handleFileUpload()}
                disabled={fileLoading}
                style={{ touchAction: "manipulation" }}
                className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                {fileLoading ? "Đang kiểm tra..." : `Upload ${txtItems.length.toLocaleString("vi-VN")} items`}
              </button>
            ) : (
              !importResult && (
                <button
                  onClick={() => txtInputRef.current?.click()}
                  style={{ touchAction: "manipulation" }}
                  className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <FileText size={14} /> Chọn file
                </button>
              )
            )
          )}

          {tab === "manual" && !importResult && (
            <button
              onClick={() => void handleManualSubmit()}
              disabled={manualLoading || !stockText.trim()}
              style={{ touchAction: "manipulation" }}
              className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package size={14} />
              {manualLoading ? "Đang kiểm tra..." : "Thêm vào kho"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCell ─────────────────────────────────────────────────────────────────
function StatCell({ label, value, variant = "gray" }: { label: string; value: number; variant?: "green" | "amber" | "red" | "gray" }) {
  const cls =
    variant === "green" ? "text-emerald-600" :
    variant === "amber" ? "text-amber-600" :
    variant === "red"   ? "text-red-600" :
    "text-gray-700";
  return (
    <div className="py-2 px-1">
      <p className={`text-sm font-bold tabular-nums ${cls}`}>{value.toLocaleString("vi-VN")}</p>
      <p className="text-[9px] text-gray-400 mt-0.5">{label}</p>
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
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
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
      const res = await fetch(`/api/seller/products/${productId}`, { credentials: "include", method: "DELETE" });
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
