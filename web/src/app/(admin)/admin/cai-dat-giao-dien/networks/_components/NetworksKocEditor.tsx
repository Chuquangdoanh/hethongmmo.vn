"use client";
import SectionSaveClient from "../../trang-chu/_components/SectionSaveClient";
import { FieldText, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";
import { SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";

interface KocItem {
  label: string;
  sub: string;
  src: string;
}

interface Props {
  initialData: Record<string, unknown>;
}

export default function NetworksKocEditor({ initialData }: Props) {
  return (
    <SectionSaveClient
      sectionKey={SITE_CONTENT_KEYS.PAGE_NETWORKS_KOC}
      initialData={initialData}
      label="THƯ VIỆN HÌNH ẢNH — Đối Tác KOC tiêu biểu"
    >
      {(data, onChange) => {
        const items = (data["items"] as KocItem[]) ?? [];
        return (
          <div className="space-y-4">
            <FieldText
              label="Nhãn section nhỏ"
              value={String(data["sectionLabel"] ?? "")}
              onChange={(v) => onChange("sectionLabel", v)}
              hint='VD: "THƯ VIỆN HÌNH ẢNH"'
            />
            <FieldText
              label="Tiêu đề section"
              value={String(data["sectionTitle"] ?? "")}
              onChange={(v) => onChange("sectionTitle", v)}
              hint='VD: "Đối Tác KOC tiêu biểu"'
            />

            <FieldSectionLabel label="Danh sách KOC / hình ảnh" />
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500">KOC {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => onChange("items", items.filter((_, idx) => idx !== i))}
                    className="text-[11px] text-red-500 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
                <ImageUpload
                  label="Ảnh đại diện"
                  value={item.src}
                  onChange={(url) => {
                    const n = [...items];
                    n[i] = { ...item, src: url };
                    onChange("items", n);
                  }}
                  uploadType="cms-page"
                  hint="Tỉ lệ 4:3 sẽ hiển thị đẹp nhất"
                />
                <FieldText
                  label="Tên / nhãn"
                  value={item.label}
                  onChange={(v) => {
                    const n = [...items];
                    n[i] = { ...item, label: v };
                    onChange("items", n);
                  }}
                  hint='VD: "IDOLS SÁNG CON TV"'
                />
                <FieldText
                  label="Mô tả phụ"
                  value={item.sub}
                  onChange={(v) => {
                    const n = [...items];
                    n[i] = { ...item, sub: v };
                    onChange("items", n);
                  }}
                  hint='VD: "100.000k Followers"'
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange("items", [...items, { label: "", sub: "", src: "" }])}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-4 py-2 transition-colors"
            >
              + Thêm KOC
            </button>
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
