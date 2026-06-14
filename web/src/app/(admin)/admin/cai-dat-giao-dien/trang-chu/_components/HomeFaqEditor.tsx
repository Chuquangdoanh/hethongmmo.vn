"use client";
import { useState } from "react";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldSectionLabel } from "./FieldInput";

interface FaqItem { q: string; a: string; }

interface Props { initialData: Record<string, unknown>; }

export default function HomeFaqEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_faq" initialData={initialData} label="❓ FAQ — Câu hỏi thường gặp">
      {(data, onChange) => {
        const items = (data["items"] as FaqItem[]) ?? [];
        return (
          <div className="space-y-4">
            <FieldText label="Tiêu đề section" value={String(data["title"] ?? "")} onChange={(v) => onChange("title", v)} />
            <FieldSectionLabel label="Danh sách câu hỏi & trả lời" />
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500">FAQ {i + 1}</p>
                  <button
                    onClick={() => {
                      const n = items.filter((_, idx) => idx !== i);
                      onChange("items", n);
                    }}
                    className="text-[11px] text-red-500 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
                <FieldText
                  label="Câu hỏi"
                  value={item.q}
                  onChange={(v) => { const n = [...items]; n[i] = { ...item, q: v }; onChange("items", n); }}
                />
                <FieldText
                  label="Trả lời"
                  value={item.a}
                  onChange={(v) => { const n = [...items]; n[i] = { ...item, a: v }; onChange("items", n); }}
                  textarea
                  rows={2}
                />
              </div>
            ))}
            <button
              onClick={() => onChange("items", [...items, { q: "", a: "" }])}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-4 py-2 transition-colors"
            >
              + Thêm câu hỏi
            </button>
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
