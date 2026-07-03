"use client";

import { useState, useEffect } from "react";
import { r2Url } from "@/lib/utils/image-url";
import { Users, X } from "lucide-react";

export interface CategoryStaffItem {
  id: string;
  name: string;
  role: string;
  description: string | null;
  avatarUrl: string | null;
}

export default function CategoryStaffSection({
  staff,
}: {
  staff: CategoryStaffItem[];
}) {
  const [selected, setSelected] = useState<CategoryStaffItem | null>(null);

  // Khóa scroll trang khi popup mở, khôi phục khi đóng
  useEffect(() => {
    if (!selected) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  if (staff.length === 0) return null;

  return (
    <section className="mt-10">
      {/* Tiêu đề — căn giữa, không phụ đề */}
      <div className="flex flex-col items-center text-center mb-5">
        <h2 className="text-lg font-bold text-[#1F2937]">Đội ngũ phụ trách</h2>
      </div>

      {/* Lưới card căn giữa — card thu nhỏ, chỉ hiện ảnh + tên */}
      <div className="flex flex-wrap justify-center gap-3.5">
        {staff.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => setSelected(person)}
            className="group flex flex-col items-center text-center w-32 rounded-2xl border border-transparent bg-white px-3 py-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#EFF6FF] bg-[#F0F6FE] flex items-center justify-center shrink-0">
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r2Url(person.avatarUrl)} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                <Users size={22} strokeWidth={1.5} className="text-[#0066FF]" />
              )}
            </div>
            <h3 className="mt-2.5 text-[13px] font-bold text-[#1F2937] group-hover:text-[#0066FF] transition-colors line-clamp-2 leading-snug">
              {person.name}
            </h3>
          </button>
        ))}
      </div>

      {/* Popup chi tiết nhân sự */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl px-6 py-7 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#0f172a]/8 hover:bg-[#0f172a]/15 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <X size={15} strokeWidth={2.5} className="text-[#475569]" />
            </button>

            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#EFF6FF] bg-[#F0F6FE] flex items-center justify-center shrink-0">
              {selected.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r2Url(selected.avatarUrl)} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <Users size={40} strokeWidth={1.5} className="text-[#0066FF]" />
              )}
            </div>

            <h3 className="mt-4 text-lg font-bold text-[#1F2937]">{selected.name}</h3>
            <p className="mt-1 text-sm font-semibold text-[#0066FF]">{selected.role}</p>
            {selected.description && (
              <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280] whitespace-pre-line">
                {selected.description}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
