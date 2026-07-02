"use client";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid, FieldSectionLabel } from "./FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";

interface BannerItem {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkUrl: string;
}

interface Props { initialData: Record<string, unknown>; }

const EMPTY_ITEM: BannerItem = { imageUrl: "", title: "", subtitle: "", linkUrl: "" };

export default function HomeBannersEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_banners" initialData={initialData} label="🖼️ Banner giữa trang (ảnh + text)">
      {(data, onChange) => {
        const items = (data["items"] as BannerItem[]) ?? [];

        function updateItem(index: number, patch: Partial<BannerItem>) {
          const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
          onChange("items", next);
        }

        function addItem() {
          onChange("items", [...items, { ...EMPTY_ITEM }]);
        }

        function removeItem(index: number) {
          onChange("items", items.filter((_, i) => i !== index));
        }

        return (
          <div className="space-y-4">
            <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              Section này hiển thị giữa mục &ldquo;Đội ngũ sáng lập&rdquo; và &ldquo;Khóa học phổ biến&rdquo; ở trang chủ.
              Ảnh định dạng 16:9, tự động co giãn trên điện thoại. Bấm vào ảnh sẽ chuyển tới link đã nhập.
              Để trống danh sách thì section sẽ ẩn.
            </p>

            <FieldGrid cols={2}>
              <FieldText label="Nhãn nhỏ (badge)" value={String(data["sectionLabel"] ?? "")} onChange={(v) => onChange("sectionLabel", v)} />
              <FieldText label="Tiêu đề section" value={String(data["sectionTitle"] ?? "")} onChange={(v) => onChange("sectionTitle", v)} />
            </FieldGrid>

            <FieldSectionLabel label={`Danh sách banner (${items.length})`} />

            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500">Banner {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    ✕ Xóa banner
                  </button>
                </div>
                <ImageUpload
                  label="Ảnh (16:9)"
                  value={item.imageUrl}
                  onChange={(url) => updateItem(i, { imageUrl: url })}
                  uploadType="cms-banner"
                  hint="Nên dùng ảnh tỉ lệ 16:9 để hiển thị đẹp nhất"
                />
                <FieldGrid cols={2}>
                  <FieldText label="Tiêu đề" value={item.title} onChange={(v) => updateItem(i, { title: v })} />
                  <FieldText
                    label="Link khi bấm vào ảnh"
                    value={item.linkUrl}
                    onChange={(v) => updateItem(i, { linkUrl: v })}
                    placeholder="https://... hoặc /trang-noi-bo"
                    hint="Để trống nếu không muốn chuyển hướng"
                  />
                </FieldGrid>
                <FieldText
                  label="Mô tả ngắn"
                  value={item.subtitle}
                  onChange={(v) => updateItem(i, { subtitle: v })}
                  textarea
                  rows={2}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-500 hover:text-blue-600 transition-all"
            >
              + Thêm banner
            </button>
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
