"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "disclaimer_dismissed_until";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function DisclaimerPopup() {
  const [open, setOpen] = useState(false);

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
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-5 py-3 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold text-gray-700 text-sm tracking-wide">
              Thông báo
            </span>
          </div>
          <button
            onClick={close}
            className="rounded-md p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-center text-sm leading-relaxed text-black">
            Nền tảng{" "}
            <span className="font-semibold text-black">không hỗ trợ</span>{" "}
            — đơn vị cá nhân chịu mọi hình thức nếu{" "}
            <span className="font-semibold text-black">vi phạm pháp luật</span>.
          </p>
        </div>

        {/* Footer — 2 nút */}
        <div className="flex gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={close}
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 active:bg-gray-900"
          >
            Đã hiểu, tiếp tục
          </button>
          <button
            onClick={dismissFor2Hours}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            Tắt trong 2 tiếng
          </button>
        </div>
      </div>
    </div>
  );
}
