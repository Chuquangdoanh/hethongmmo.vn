"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { r2Url } from "@/lib/utils/image-url";
import { useRouter } from "next/navigation";
import ServiceFilterPanel from "./ServiceFilterPanel";
import type { ServiceStat } from "./ServiceFilterPanel";

interface Testimonial {
  id: string;
  type: "COURSE" | "SERVICE";
  serviceId: string | null;
  category: string | null;
  reviewerName: string;
  reviewerRole: string | null;
  reviewerAvatar: string | null;
  reviewerColor: string | null;
  reviewerInitials: string | null;
  content: string;
  rating: number;
  isActive: boolean;
  displayOrder: number;
  course: { id: string; name: string; slug: string } | null;
}

export default function TestimonialList({
  items: initial,
  serviceStats,
  courseStats,
}: {
  items: Testimonial[];
  serviceStats: ServiceStat[];
  courseStats: ServiceStat[];
}) {
  const router = useRouter();
  const [tab, setTab]                               = useState<"ALL" | "COURSE" | "SERVICE">("ALL");
  const [selectedServiceId, setSelectedServiceId]   = useState<string | null>(null);
  const [selectedCourseId,  setSelectedCourseId]    = useState<string | null>(null);
  const [toggling, setToggling]                     = useState<string | null>(null);

  const filtered = initial.filter((t) => {
    if (tab !== "ALL" && t.type !== tab) return false;
    if (selectedServiceId && t.serviceId !== selectedServiceId) return false;
    if (selectedCourseId  && t.course?.id !== selectedCourseId) return false;
    return true;
  });

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/admin/testimonials/${id}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  const TABS = [
    { id: "ALL"     as const, label: `Tất cả (${initial.length})` },
    { id: "COURSE"  as const, label: `Khóa học (${initial.filter(t => t.type === "COURSE").length})` },
    { id: "SERVICE" as const, label: `Dịch vụ (${initial.filter(t => t.type === "SERVICE").length})` },
  ];

  const serviceItems = initial.filter((t) => t.type === "SERVICE");
  const courseItems  = initial.filter((t) => t.type === "COURSE");

  return (
    <div className="space-y-4">
      {/* Filter panels */}
      {tab === "SERVICE" && (
        <ServiceFilterPanel
          title="Lọc theo dịch vụ"
          services={serviceStats}
          selectedId={selectedServiceId}
          totalServiceCount={serviceItems.length}
          onSelect={setSelectedServiceId}
        />
      )}
      {tab === "COURSE" && (
        <ServiceFilterPanel
          title="Lọc theo khóa học"
          services={courseStats}
          selectedId={selectedCourseId}
          totalServiceCount={courseItems.length}
          onSelect={setSelectedCourseId}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSelectedServiceId(null); setSelectedCourseId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === id
                ? "bg-[#7C3AED]/10 text-[#7C3AED] border-b-2 border-[#7C3AED]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Chưa có đánh giá nào. <Link href="/admin/danh-gia/tao-moi" className="text-[#7C3AED] hover:underline">Tạo mới</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 flex gap-4 items-start transition-opacity ${t.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden relative"
                style={{ background: t.reviewerAvatar ? undefined : (t.reviewerColor ?? "#7c3aed") }}
              >
                {t.reviewerAvatar ? (
                  <Image src={r2Url(t.reviewerAvatar)} alt={t.reviewerName} fill className="object-cover" />
                ) : (
                  t.reviewerInitials ?? t.reviewerName.slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-gray-800">{t.reviewerName}</span>
                  {t.reviewerRole && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.reviewerRole}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.type === "COURSE" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                    {t.type === "COURSE" ? "📚 Khóa học" : "⚡ Dịch vụ"}
                  </span>
                  {t.category && <span className="text-[10px] text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-full">{t.category}</span>}
                  {t.course && <span className="text-[10px] text-gray-500 truncate max-w-30">{t.course.name}</span>}
                </div>
                <p className="text-[11px] text-amber-500 mb-1">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{t.content}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(t.id, t.isActive)}
                  disabled={toggling === t.id}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${t.isActive ? "bg-[#7C3AED]" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${t.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <Link
                  href={`/admin/danh-gia/${t.id}/sua`}
                  className="text-xs text-gray-500 hover:text-[#7C3AED] px-2 py-1 rounded hover:bg-[#7C3AED]/5 transition-colors"
                >
                  Sửa
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
