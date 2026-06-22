"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ImportError {
  line: number;
  value: string;
  type: "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";
  detail: string;
}

interface ImportResult {
  preview: boolean;
  totalRows: number;
  validRows: number;
  insertedRows: number;
  duplicateInFile: number;
  duplicateInDatabase: number;
  errors: ImportError[];
}

interface Props {
  productId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function StockImportForm({ productId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"preview" | "import" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const validateAndSetFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".txt")) {
      setError("Chỉ chấp nhận file .txt");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File quá lớn. Tối đa 10MB.");
      return;
    }
    setError("");
    setResult(null);
    setMode(null);
    setFile(f);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }

  async function callApi(preview: boolean) {
    if (!file) return;
    setError("");
    setMode(preview ? "preview" : "import");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const url = `/api/products/mmo/${productId}/stock/import${preview ? "?preview=true" : ""}`;
      const res = await fetch(url, { method: "POST", credentials: "include", body: fd });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: ImportResult;
      };

      if (!res.ok || !json.success) {
        setError(json.error ?? "Yêu cầu thất bại.");
        setMode(null);
        return;
      }

      setResult(json.data!);

      if (!preview) {
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      setMode(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setResult(null);
    setError("");
    setMode(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadErrors(errors: ImportError[]) {
    const header = "Dòng\tGiá trị\tLoại lỗi\tChi tiết";
    const rows = errors.map(
      (e) => `${e.line}\t${e.value}\t${e.type === "DUPLICATE_IN_FILE" ? "Trùng trong file" : "Trùng với kho"}\t${e.detail}`,
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/tab-separated-values;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${Date.now()}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canConfirmImport =
    result?.preview &&
    result.validRows > 0 &&
    !loading;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Import kho bằng file .txt</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Mỗi dòng = 1 item. Tối đa 10.000 dòng / 10MB. Tự động kiểm tra trùng trong file và với kho hiện có.
        </p>
      </div>

      {/* File drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[#7C3AED] bg-purple-50"
            : file
            ? "border-[#10B981] bg-green-50"
            : "border-gray-200 hover:border-[#7C3AED] bg-white"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
            </div>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="space-y-1">
            <svg className="w-8 h-8 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-500">Kéo thả file .txt vào đây hoặc nhấn để chọn</p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />

      {/* Action buttons */}
      {file && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Xóa file
          </button>
          <button
            type="button"
            onClick={() => callApi(true)}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-[#7C3AED] text-[#7C3AED] text-xs font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            {loading && mode === "preview" ? "Đang phân tích..." : "Xem trước"}
          </button>
          <button
            type="button"
            onClick={() => callApi(false)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#10B981] text-white text-xs font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {loading && mode === "import" ? "Đang nhập kho..." : "Import ngay"}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Results panel */}
      {result && (
        <div className="space-y-3">
          {/* Header */}
          <div className={`p-4 rounded-lg border ${
            result.preview
              ? "bg-purple-50 border-purple-200"
              : result.insertedRows > 0
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-semibold ${
                result.preview ? "text-purple-700" : result.insertedRows > 0 ? "text-green-700" : "text-yellow-700"
              }`}>
                {result.preview ? "Kết quả xem trước (chưa nhập kho)" : "Kết quả import kho"}
              </p>
              {result.preview && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                  CHỈ XEM TRƯỚC
                </span>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatBox label="Tổng dòng đọc được" value={result.totalRows} color="text-gray-700" />
              <StatBox label="Dòng hợp lệ" value={result.validRows} color="text-green-600" />
              <StatBox
                label={result.preview ? "Sẽ nhập vào kho" : "Đã nhập vào kho"}
                value={result.preview ? result.validRows : result.insertedRows}
                color="text-green-700"
                bold
              />
              <StatBox
                label="Trùng trong file"
                value={result.duplicateInFile}
                color={result.duplicateInFile > 0 ? "text-orange-500" : "text-gray-400"}
              />
              <StatBox
                label="Trùng với kho"
                value={result.duplicateInDatabase}
                color={result.duplicateInDatabase > 0 ? "text-red-500" : "text-gray-400"}
              />
            </div>
          </div>

          {/* Confirm import button (shown after preview) */}
          {canConfirmImport && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-green-700 flex-1">
                Sẵn sàng nhập <strong>{result.validRows.toLocaleString("vi-VN")}</strong> item hợp lệ vào kho.
              </p>
              <button
                type="button"
                onClick={() => callApi(false)}
                className="px-4 py-2 rounded-lg bg-[#10B981] text-white text-xs font-semibold hover:bg-green-500 transition-colors whitespace-nowrap"
              >
                Xác nhận nhập kho
              </button>
            </div>
          )}

          {/* Error list */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  Chi tiết lỗi ({result.errors.length.toLocaleString("vi-VN")} mục)
                </p>
                <button
                  type="button"
                  onClick={() => downloadErrors(result.errors)}
                  className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải file lỗi (.tsv)
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium w-16">Dòng</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Giá trị</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium w-28">Loại lỗi</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr
                          key={i}
                          className={`${i !== 0 ? "border-t border-gray-100" : ""}`}
                        >
                          <td className="px-3 py-1.5 text-gray-400 tabular-nums">{err.line}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-700">
                            <span className="truncate block max-w-[200px]" title={err.value}>
                              {err.value.length > 60 ? err.value.slice(0, 60) + "…" : err.value}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                err.type === "DUPLICATE_IN_FILE"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {err.type === "DUPLICATE_IN_FILE" ? "Trùng file" : "Trùng kho"}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{err.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {result.errors.length === 0 && !result.preview && (
            <p className="text-xs text-green-600 font-medium">
              Không có lỗi — toàn bộ {result.insertedRows.toLocaleString("vi-VN")} item đã được nhập kho thành công.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className={`text-lg ${bold ? "font-bold" : "font-semibold"} ${color}`}>
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{label}</p>
    </div>
  );
}
