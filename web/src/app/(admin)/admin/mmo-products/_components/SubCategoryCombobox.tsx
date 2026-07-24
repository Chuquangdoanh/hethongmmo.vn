"use client";

import { useState, useEffect, useRef } from "react";

interface SubItem {
  id: string;
  name: string;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
  showInToolPhanMem: boolean;
}

interface Props {
  categoryGroup: string;
  value: string;
  onChange: (value: string) => void;
  section?: "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN" | "TOOL_PHAN_MEM";
  required?: boolean;
}

export default function SubCategoryCombobox({ categoryGroup, value, onChange, section, required }: Props) {
  const [items, setItems] = useState<SubItem[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch sub-categories when categoryGroup changes
  useEffect(() => {
    const group = categoryGroup.trim();
    if (!group) { setItems([]); setQuery(""); onChange(""); return; }
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/sub-categories?category=${encodeURIComponent(group)}`, { credentials: "include" });
        const json = await res.json() as { data?: SubItem[] };
        setItems(json.data ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryGroup]);

  // Sync query khi value thay đổi từ bên ngoài (edit mode)
  useEffect(() => { setQuery(value); }, [value]);

  // Đóng khi click ngoài
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Lọc theo khu vực hiển thị trước, rồi mới lọc theo query
  // Nguyên liệu MMO đã gộp chung với Kho tài nguyên ở trang public — lọc theo cả 2 cờ (OR)
  const sectionFiltered = items.filter((s) => {
    if (section === "TAI_NGUYEN_MMO") return s.showInTaiNguyenMmo || s.showInKhoTaiNguyen;
    if (section === "TOOL_PHAN_MEM") return s.showInToolPhanMem;
    return true;
  });

  const filtered = sectionFiltered.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(sub: SubItem) {
    onChange(sub.name);
    setQuery(sub.name);
    setOpen(false);
  }

  function handleInput(v: string) {
    setQuery(v);
    onChange(v);
    setOpen(true);
  }

  if (!categoryGroup.trim()) {
    return (
      <input
        disabled
        placeholder="Chọn nhóm danh mục trước"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={query}
          placeholder={loading ? "Đang tải..." : items.length > 0 ? "Chọn hoặc nhập danh mục con..." : "Nhập tên danh mục con..."}
          onChange={(e) => handleInput(e.target.value)}
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

      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {sectionFiltered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 italic">
              Chưa có danh mục con nào{section === "TAI_NGUYEN_MMO" ? " trong Nguyên Liệu" : section === "TOOL_PHAN_MEM" ? " trong Tool - Phần mềm" : ""} cho nhóm <strong>{categoryGroup}</strong>.<br />
              Thêm tại trang <span className="text-[#7C3AED] font-medium">Danh mục tài nguyên</span> hoặc nhập tay bên dưới.
            </p>
          ) : (
            <>
              {filtered.length > 0 ? (
                <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {filtered.map((sub) => (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(sub)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                          sub.name === value
                            ? "bg-[#f5f3ff] text-[#7C3AED] font-semibold"
                            : "text-gray-800 hover:bg-[#f5f3ff] hover:text-[#7C3AED]"
                        }`}
                      >
                        <span className="flex-1">{sub.name}</span>
                        {sub.name === value && (
                          <svg className="w-3.5 h-3.5 shrink-0 text-[#7C3AED]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy. Bạn có thể nhập tự do.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
