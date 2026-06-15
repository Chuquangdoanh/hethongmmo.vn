"use client";
import SectionSaveClient from "../../trang-chu/_components/SectionSaveClient";
import { FieldText, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";
import { SITE_CONTENT_KEYS } from "@/lib/services/site-content.keys";

interface Props {
  initialData: Record<string, unknown>;
}

export default function NetworksTrustEditor({ initialData }: Props) {
  return (
    <SectionSaveClient
      sectionKey={SITE_CONTENT_KEYS.PAGE_NETWORKS_TRUST}
      initialData={initialData}
      label="VỀ NETWORK — Cam kết uy tín & bảo mật"
    >
      {(data, onChange) => {
        const items = (data["trustPoints"] as string[]) ?? [];
        return (
          <div className="space-y-4">
            <FieldText
              label="Tiêu đề section"
              value={String(data["sectionTitle"] ?? "")}
              onChange={(v) => onChange("sectionTitle", v)}
              hint='VD: "Cam kết uy tín và bảo mật"'
            />
            <ImageUpload
              label="Ảnh bên phải"
              value={String(data["sideImage"] ?? "")}
              onChange={(url) => onChange("sideImage", url)}
              uploadType="cms-page"
              hint="Ảnh hiển thị bên phải trong section VỀ NETWORK"
            />

            <FieldSectionLabel label="Danh sách cam kết (trust points)" />
            {items.map((pt, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <FieldText
                    label={`Cam kết ${i + 1}`}
                    value={pt}
                    onChange={(v) => {
                      const n = [...items];
                      n[i] = v;
                      onChange("trustPoints", n);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange("trustPoints", items.filter((_, idx) => idx !== i))}
                  className="pb-1 text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
                >
                  Xóa
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange("trustPoints", [...items, ""])}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg px-4 py-2 transition-colors"
            >
              + Thêm cam kết
            </button>
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
