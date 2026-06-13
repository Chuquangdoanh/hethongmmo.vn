"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { r2Url } from "@/lib/utils/image-url";

interface Category {
  id: string;
  name: string;
  iconUrl: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function ServiceCategoryCombobox({ value, onChange, required }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/service-categories", { credentials: "include" });
      const json = await res.json() as { data?: Category[] };
      if (json.data) setCategories(json.data);
    } catch {
      // ignore
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  // Refetch khi dropdown mở — phản ánh danh mục mới từ /admin/service-categories
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) void fetchCategories(); }, [open, fetchCategories]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCustomText("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = categories.find((c) => c.name === value);

  function handleSelect(cat: Category) {
    onChange(cat.name);
    setOpen(false);
    setCustomText("");
  }

  function handleCustomConfirm() {
    const name = customText.trim();
    if (!name) return;
    onChange(name);
    setOpen(false);
    setCustomText("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button — hiện danh mục đang chọn */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm flex items-center gap-2 text-left focus:border-[#7C3AED] focus:outline-none"
      >
        {selected?.iconUrl ? (
          <span className="flex items-center justify-center w-4 h-4 bg-white rounded-sm p-0.5 shrink-0 border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r2Url(selected.iconUrl)} alt={selected.name} className="w-full h-full object-contain" />
          </span>
        ) : null}
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || "Chọn danh mục..."}
        </span>
        <span className="ml-auto text-gray-400 text-xs">▾</span>
      </button>

      {/* Hidden input for required validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          aria-hidden
        />
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">
              Chưa có danh mục. Vào <strong>DM Dịch vụ</strong> để tạo trước.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2 max-h-52 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  title={cat.name}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all hover:bg-gray-100 ${
                    value === cat.name ? "bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/30" : ""
                  }`}
                >
                  {cat.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 text-xs">
                      📁
                    </span>
                  )}
                  <span className="text-[9px] text-gray-500 leading-tight max-w-14 truncate">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Nhập tùy chỉnh */}
          <div className="border-t border-gray-100 p-2 flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCustomConfirm(); } }}
              placeholder="Hoặc nhập danh mục khác..."
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-[#7C3AED] focus:outline-none"
            />
            {customText.trim() && (
              <button
                type="button"
                onClick={handleCustomConfirm}
                className="px-2.5 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#A855F7] transition-colors"
              >
                Chọn
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
