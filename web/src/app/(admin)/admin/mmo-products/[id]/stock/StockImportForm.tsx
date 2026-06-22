"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, X, Download,
  AlertTriangle, AlertCircle, CheckCircle,
} from "lucide-react";

const MAX_IMPORT_ITEMS = 10_000;
const MAX_FILE_SIZE_MB = 10;

type DuplicateType = "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";

interface ImportError {
  line: number;
  value: string;
  type: DuplicateType;
  detail: string;
}

interface ImportResult {
  preview: boolean;
  totalRows: number;
  validRows: number;
  insertedRows: number;
  duplicateInFile: number;
  duplicateInDatabase: number;
  totalErrors: number;
  errors: ImportError[];
}

interface Props {
  productId: string;
}

const DUP_LABEL: Record<DuplicateType, string> = {
  DUPLICATE_IN_FILE: "Trùng file",
  DUPLICATE_IN_DATABASE: "Trùng kho",
};

const DUP_CLASS: Record<DuplicateType, string> = {
  DUPLICATE_IN_FILE: "bg-amber-50 text-amber-700 border-amber-200",
  DUPLICATE_IN_DATABASE: "bg-red-50 text-red-600 border-red-200",
};

export default function StockImportForm({ productId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    setFileError("");

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File quá lớn. Tối đa ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result ?? "") as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length === 0) {
        setFileError("File không có nội dung hợp lệ.");
        e.target.value = "";
        return;
      }
      if (lines.length > MAX_IMPORT_ITEMS) {
        setFileError(
          `File có ${lines.length.toLocaleString("vi-VN")} dòng, vượt giới hạn ${MAX_IMPORT_ITEMS.toLocaleString("vi-VN")} dòng. Hãy chia nhỏ file.`,
        );
        e.target.value = "";
        return;
      }

      setFileName(file.name);
      setItems(lines);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function clearFile() {
    setItems([]);
    setFileName("");
    setImportResult(null);
    setFileError("");
  }

  async function callApi(preview: boolean) {
    if (items.length === 0) return;
    setUploading(true);
    setFileError("");
    setImportResult(null);

    try {
      const res = await fetch(`/api/products/mmo/${productId}/stock/import`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, preview }),
      });
      const json = (await res.json()) as { data?: ImportResult; error?: string };

      if (res.ok && json.data) {
        setImportResult(json.data);
        if (!preview) {
          setItems([]);
          setFileName("");
          if (json.data.insertedRows > 0) router.refresh();
        }
      } else {
        setFileError(json.error ?? "Upload thất bại. Vui lòng thử lại.");
      }
    } catch {
      setFileError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  function downloadErrors(errors: ImportError[]) {
    const header = "Dòng\tNội dung\tLoại lỗi\tMô tả";
    const rows = errors.map(
      (e) => `${e.line}\t${e.value}\t${DUP_LABEL[e.type]}\t${e.detail}`,
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FileText size={15} className="text-violet-600 shrink-0" />
        <p className="text-sm font-semibold text-violet-800">Thêm kho từ file TXT</p>
        <span className="text-[10px] text-violet-500 ml-1">
          (mỗi dòng = 1 item · tối đa {MAX_IMPORT_ITEMS.toLocaleString("vi-VN")} dòng)
        </span>
      </div>

      {/* Import result panel */}
      {importResult && (
        <div className="mb-3 rounded-lg border bg-white overflow-hidden">
          {/* Stats row */}
          <div className="grid grid-cols-5 divide-x divide-gray-100 text-center border-b border-gray-100">
            <StatCell label="Tổng dòng" value={importResult.totalRows} />
            <StatCell
              label={importResult.preview ? "Sẽ thêm" : "Đã thêm"}
              value={importResult.preview ? importResult.validRows : importResult.insertedRows}
              variant={
                (importResult.preview ? importResult.validRows : importResult.insertedRows) > 0
                  ? "green"
                  : "gray"
              }
            />
            <StatCell label="Hợp lệ" value={importResult.validRows} />
            <StatCell
              label="Trùng file"
              value={importResult.duplicateInFile}
              variant={importResult.duplicateInFile > 0 ? "amber" : "gray"}
            />
            <StatCell
              label="Trùng kho"
              value={importResult.duplicateInDatabase}
              variant={importResult.duplicateInDatabase > 0 ? "red" : "gray"}
            />
          </div>

          {/* Banner */}
          {importResult.totalErrors === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle size={13} />
              <span>
                {importResult.preview
                  ? `Xem trước: ${importResult.validRows.toLocaleString("vi-VN")} item sẽ được thêm vào kho.`
                  : `Tất cả ${importResult.insertedRows.toLocaleString("vi-VN")} item đã được thêm thành công.`}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle size={13} />
                <span>
                  {importResult.preview ? "Xem trước: " : ""}
                  {importResult.preview
                    ? `${importResult.validRows.toLocaleString("vi-VN")} item hợp lệ`
                    : `Thêm ${importResult.insertedRows.toLocaleString("vi-VN")} item`}
                  {" · "}bỏ qua{" "}
                  <strong>{importResult.totalErrors.toLocaleString("vi-VN")}</strong> dòng lỗi
                </span>
              </div>
              <button
                onClick={() => downloadErrors(importResult.errors)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 text-[11px] hover:border-gray-300 hover:text-gray-700 transition-colors whitespace-nowrap"
              >
                <Download size={11} /> Tải danh sách lỗi
              </button>
            </div>
          )}

          {/* Error table */}
          {importResult.errors.length > 0 && (
            <div className="border-t border-gray-100 max-h-52 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 w-12">Dòng</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500">Nội dung</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 w-24">Loại lỗi</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 hidden sm:table-cell">Mô tả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importResult.errors.slice(0, 50).map((err, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-1.5 text-gray-400 tabular-nums">{err.line}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700 max-w-0">
                        <span className="block truncate">{err.value}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold ${DUP_CLASS[err.type]}`}>
                          {DUP_LABEL[err.type]}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 hidden sm:table-cell">{err.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importResult.errors.length > 50 && (
                <p className="text-center text-[11px] text-gray-400 py-2 border-t border-gray-50">
                  ...và {(importResult.errors.length - 50).toLocaleString("vi-VN")} lỗi khác. Tải file để xem đầy đủ.
                </p>
              )}
            </div>
          )}

          {/* Confirm import button after preview */}
          {importResult.preview && importResult.validRows > 0 && (
            <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between gap-3 bg-emerald-50">
              <p className="text-xs text-emerald-700">
                Sẵn sàng thêm <strong>{importResult.validRows.toLocaleString("vi-VN")}</strong> item vào kho.
              </p>
              <button
                onClick={() => void callApi(false)}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Upload size={12} />
                Xác nhận nhập kho
              </button>
            </div>
          )}
        </div>
      )}

      {/* File error */}
      {fileError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{fileError}</p>
        </div>
      )}

      {/* File selected → show info + action buttons */}
      {items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-violet-200">
            <FileText size={13} className="text-violet-400 shrink-0" />
            <span className="text-xs text-gray-700 flex-1 truncate">{fileName}</span>
            <span className="text-xs font-bold text-violet-700 shrink-0">
              {items.length.toLocaleString("vi-VN")} dòng
            </span>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Xóa file"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => void callApi(true)}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-violet-400 text-violet-700 bg-white text-xs font-semibold hover:bg-violet-50 disabled:opacity-60 transition-colors"
            >
              {uploading ? "Đang phân tích..." : "Xem trước"}
            </button>
            <button
              onClick={() => void callApi(false)}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              <Upload size={12} />
              {uploading
                ? "Đang kiểm tra và thêm kho..."
                : `Upload ${items.length.toLocaleString("vi-VN")} items`}
            </button>
            <button
              onClick={clearFile}
              disabled={uploading}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:border-gray-300 transition-colors"
            >
              Hủy
            </button>
          </div>

          {uploading && (
            <p className="text-[10px] text-violet-500">
              Đang kiểm tra trùng lặp và thêm vào kho, vui lòng chờ...
            </p>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-violet-300 bg-white py-6 text-center hover:border-violet-500 hover:bg-violet-50/50 transition-colors"
          >
            <Upload size={20} className="text-violet-400" />
            <p className="text-xs text-violet-600 font-medium">Click để chọn file .txt</p>
            <p className="text-[10px] text-gray-400">
              Mỗi dòng = 1 item · Tối đa {MAX_IMPORT_ITEMS.toLocaleString("vi-VN")} dòng · UTF-8 · Max {MAX_FILE_SIZE_MB}MB
            </p>
            <p className="text-[10px] text-gray-400">
              Hệ thống tự động kiểm tra trùng lặp trong file và trong kho
            </p>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  variant = "gray",
}: {
  label: string;
  value: number;
  variant?: "green" | "amber" | "red" | "gray";
}) {
  const cls =
    variant === "green" ? "text-emerald-600" :
    variant === "amber" ? "text-amber-600" :
    variant === "red"   ? "text-red-600" :
    "text-gray-700";

  return (
    <div className="py-2 px-1">
      <p className={`text-sm font-bold tabular-nums ${cls}`}>
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
