"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Đã sao chép!" : "Sao chép"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
        ${copied
          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
          : "bg-[#1F1F2E] text-[#A1A1AA] border border-[#2A2A38] hover:border-[#7C3AED] hover:text-[#F4F4F5]"
        } ${className}`}
    >
      {copied ? (
        <>
          <Check size={12} />
          Đã sao chép
        </>
      ) : (
        <>
          <Copy size={12} />
          Sao chép
        </>
      )}
    </button>
  );
}
