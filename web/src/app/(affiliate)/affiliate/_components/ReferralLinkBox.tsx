"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const COPIED_RESET_MS = 2000;

export default function ReferralLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Trình duyệt chặn clipboard — bỏ qua
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full truncate rounded-md border border-gray-200 bg-gray-50 pl-3 pr-10 py-2 text-sm text-gray-800 focus:outline-none focus:border-primary transition-colors"
      />
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Đã sao chép!" : "Sao chép"}
        aria-label={copied ? "Đã sao chép" : "Sao chép link giới thiệu"}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 text-gray-400 hover:text-primary transition-colors"
      >
        {copied ? <Check size={16} className="text-[#10b981]" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
