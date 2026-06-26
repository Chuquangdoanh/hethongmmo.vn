"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckSquare, Square } from "lucide-react";

const STORAGE_KEY = "disclaimer_dismissed_until";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function DisclaimerPopup() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const dismissedUntil = raw ? Number(raw) : 0;
    if (Date.now() > dismissedUntil) {
      setOpen(true);
    }
  }, []);

  function close() {
    setOpen(false);
  }

  function dismissFor2Hours() {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + TWO_HOURS_MS));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 border-b border-gray-200 bg-gray-100 px-5 py-3 rounded-t-xl">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <span className="font-semibold text-gray-700 text-sm tracking-wide uppercase">
            Thông Báo Quan Trọng
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm leading-relaxed text-black">
            Mọi tài nguyên trên <span className="font-semibold">hethongmmo.vn</span> chỉ phục vụ cho các mục đích hợp pháp theo quy định của pháp luật.
          </p>
          <p className="text-sm leading-relaxed text-black">
            Khách hàng tự chịu trách nhiệm về việc sử dụng sau khi mua. <span className="font-semibold">hethongmmo.vn</span> không chịu trách nhiệm đối với mọi hành vi vi phạm pháp luật phát sinh từ người sử dụng.
          </p>

          {/* Checkbox */}
          <button
            onClick={() => setAgreed((v) => !v)}
            className="flex items-center gap-2 pt-1 group w-full text-left"
          >
            {agreed ? (
              <CheckSquare size={18} className="text-gray-800 shrink-0" />
            ) : (
              <Square size={18} className="text-gray-400 shrink-0 group-hover:text-gray-600 transition-colors" />
            )}
            <span className={`text-sm transition-colors ${agreed ? "text-gray-800 font-medium" : "text-gray-500"}`}>
              Tôi đã đọc và đồng ý với điều khoản.
            </span>
          </button>
        </div>

        {/* Footer — 2 nút */}
        <div className="flex gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={close}
            disabled={!agreed}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800
              disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            Thoát
          </button>
          <button
            onClick={dismissFor2Hours}
            disabled={!agreed}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors
              bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Tôi Đồng Ý
          </button>
        </div>
      </div>
    </div>
  );
}
