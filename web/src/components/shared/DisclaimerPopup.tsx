"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, FileText, CheckSquare, Square, ArrowRight } from "lucide-react";

const STORAGE_KEY = "disclaimer_dismissed_until";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function DisclaimerPopup() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const dismissedUntil = raw ? Number(raw) : 0;
    if (Date.now() > dismissedUntil) setOpen(true);
  }, []);

  function close() { setOpen(false); }

  function dismissFor2Hours() {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + TWO_HOURS_MS));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3.5 rounded-t-2xl shrink-0">
          <AlertTriangle size={17} className="text-amber-500 shrink-0" />
          <span className="font-semibold text-gray-700 text-sm tracking-wide uppercase">
            Thông Báo Quan Trọng
          </span>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* 1 card duy nhất chứa tất cả nội dung */}
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">

            {/* Intro */}
            <div className="px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                Mọi Tài Nguyên Trên <span className="font-bold">HETHONGMMO</span> Phục Vụ Giúp Ích Cho Người Dùng Và Các Mục Đích Hợp Pháp Theo Quy Định Của Pháp Luật ‼️
              </p>
            </div>

            {/* Tuyên bố miễn trách nhiệm */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Tuyên Bố Miễn Trách Nhiệm</p>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">
                Cấm sử dụng tài nguyên với mục đích vi phạm pháp luật: <span className="font-semibold">Lừa đảo, chiếm đoạt tài sản, chống phá Đảng và Nhà Nước CHXHCN Việt Nam.</span>
              </p>
              <div className="flex items-start gap-1.5">
                <ArrowRight size={13} className="text-gray-900 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-900 leading-relaxed">
                  Khi cơ quan chức năng cần cung cấp thông tin, chúng tôi sẽ hợp tác và tuyên bố miễn trách nhiệm với tất cả sản phẩm đã bán ra.
                </p>
              </div>
            </div>

            {/* Chính sách bảo mật */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Chính Sách Bảo Mật</p>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">
                Khách hàng tự chịu trách nhiệm về việc sử dụng sau khi mua. <span className="font-semibold">hethongmmo.vn</span> không chịu trách nhiệm đối với mọi hành vi vi phạm pháp luật phát sinh từ người sử dụng.
              </p>
            </div>

            {/* Thu thập thông tin */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-violet-500 shrink-0" />
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Thu Thập &amp; Bảo Vệ Thông Tin</p>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">
                Chúng tôi thu thập thông tin cá nhân chỉ để cung cấp dịch vụ và không chia sẻ với bên thứ ba ngoài phạm vi pháp lý.
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <button
            onClick={() => setAgreed((v) => !v)}
            className="flex items-center gap-2 group w-full text-left"
          >
            {agreed ? (
              <CheckSquare size={17} className="text-gray-800 shrink-0" />
            ) : (
              <Square size={17} className="text-gray-400 shrink-0 group-hover:text-gray-600 transition-colors" />
            )}
            <span className={`text-sm transition-colors ${agreed ? "text-gray-800 font-medium" : "text-gray-500"}`}>
              Tôi đã đọc và đồng ý với điều khoản.
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-200 px-5 py-3.5 shrink-0">
          <button
            onClick={close}
            disabled={!agreed}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800
              disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={dismissFor2Hours}
            disabled={!agreed}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors
              bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Tôi đã đọc &amp; đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
