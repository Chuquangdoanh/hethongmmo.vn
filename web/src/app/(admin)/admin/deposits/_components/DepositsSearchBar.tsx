"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface Props {
  currentType: string;
  currentQ: string;
}

export default function DepositsSearchBar({ currentType, currentQ }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentQ);

  // Sync khi server render mới (chuyển tab type, v.v.)
  useEffect(() => { setValue(currentQ); }, [currentQ]);

  // Debounce → cập nhật URL
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (currentType) params.set("type", currentType);
      if (value.trim()) params.set("q", value.trim());
      router.push(`/admin/deposits${params.size ? `?${params}` : ""}`);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex-1">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm email, họ tên, mã tham chiếu..."
        suppressHydrationWarning
        className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#7C3AED] bg-white"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
