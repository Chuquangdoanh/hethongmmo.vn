"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { r2Url } from "@/lib/utils/image-url";

interface Category {
  id: string;
  name: string;
  iconUrl: string | null;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  section?: "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN";
  placeholder?: string;
  required?: boolean;
}

export default function CategoryCombobox({ value, onChange, section, placeholder, required }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/resource-categories", { credentials: "include" });
      const json = await res.json() as { data?: Category[] };
      if (json.data) setCategories(json.data);
    } catch {
      // ignore
    }
  }, []);

  // Fetch on mount AND every time dropdown opens — so new categories from
  // /admin/resource-categories appear immediately without page reload.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) void fetchCategories(); }, [open, fetchCategories]);

  // Sync query khi value thay đổi từ bên ngoài (edit mode hoặc reset từ form)
  useEffect(() => { setQuery(value); }, [value]);

  // Reset selection khi đổi section — danh mục của kho khác không còn phù hợp
  useEffect(() => {
    onChange("");
    setQuery("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lọc theo khu vực hiển thị trước, rồi mới lọc theo query
  const sectionFiltered = categories.filter((c) => {
    if (section === "KHO_TAI_NGUYEN") return c.showInKhoTaiNguyen;
    if (section === "TAI_NGUYEN_MMO") return c.showInTaiNguyenMmo;
    return true;
  });

  const filtered = sectionFiltered.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const exactMatch = sectionFiltered.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase()
  );

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/resource-categories", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          showInKhoTaiNguyen: section === "KHO_TAI_NGUYEN",
          showInTaiNguyenMmo: section === "TAI_NGUYEN_MMO",
        }),
      });
      const json = await res.json() as { data?: Category; error?: string };
      if (!res.ok) {
        setCreateError(json.error ?? "Tạo danh mục thất bại");
        return;
      }
      if (json.data) {
        setCategories((prev) => [...prev, json.data!].sort((a, b) => a.name.localeCompare(b.name)));
        onChange(json.data.name);
        setQuery(json.data.name);
      }
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(cat: Category) {
    onChange(cat.name);
    setQuery(cat.name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none pr-8"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {sectionFiltered.length === 0 && !query && (
            <p className="px-3 py-2.5 text-xs text-gray-400">
              {section === "KHO_TAI_NGUYEN"
                ? "Chưa có danh mục nào trong Kho Tài Nguyên. Nhập tên để tạo mới."
                : section === "TAI_NGUYEN_MMO"
                ? "Chưa có danh mục nào trong Nguyên Liệu. Nhập tên để tạo mới."
                : "Chưa có danh mục tài nguyên. Nhập tên để tạo mới."}
            </p>
          )}

          {filtered.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {filtered.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-[#f5f3ff] transition-colors text-left"
                  >
                    {cat.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-4 h-4 rounded-sm object-contain shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-sm bg-gray-100 shrink-0" />
                    )}
                    {cat.name}
                    {cat.name === value && (
                      <svg className="ml-auto w-3.5 h-3.5 text-[#7C3AED]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim() && !exactMatch && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="w-full flex items-center gap-2 text-xs font-medium text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-60 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {creating ? "Đang tạo..." : `Tạo danh mục "${query.trim()}"`}
              </button>
              {createError && <p className="mt-1 text-xs text-red-500">{createError}</p>}
            </div>
          )}

          {filtered.length === 0 && !query.trim() && categories.length > 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy danh mục.</p>
          )}
        </div>
      )}
    </div>
  );
}
