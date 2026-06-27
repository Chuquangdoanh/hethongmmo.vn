"use client";

import { useState } from "react";
import { FileText, Pencil } from "lucide-react";
import StockImportForm from "../StockImportForm";
import StockUploadForm from "../StockUploadForm";

interface Props {
  productId: string;
}

export default function StockKhoHangSection({ productId }: Props) {
  const [tab, setTab] = useState<"file" | "manual">("file");

  return (
    <div className="rounded-xl border-2 border-[#e11d48]/30 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-[#e11d48]/10">
        <p className="text-xs font-semibold text-[#e11d48] uppercase tracking-wider">Kho hàng</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Thêm kho từ file TXT hoặc nhập tay. Hệ thống tự động loại bỏ dòng trùng trong file.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-3">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5 overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("file")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === "file"
                ? "bg-white text-[#e11d48] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <FileText size={12} /> Upload TXT
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === "manual"
                ? "bg-white text-[#e11d48] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Pencil size={12} /> Nhập tay
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {tab === "file" ? (
          <StockImportForm productId={productId} />
        ) : (
          <StockUploadForm productId={productId} />
        )}
      </div>
    </div>
  );
}
