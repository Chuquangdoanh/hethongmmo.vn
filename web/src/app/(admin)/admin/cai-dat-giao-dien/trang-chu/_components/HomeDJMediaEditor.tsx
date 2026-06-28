"use client";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid, FieldSectionLabel } from "./FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";
import { MultiImageUpload } from "../../_components/MultiImageUpload";

interface Props { initialData: Record<string, unknown>; }

export default function HomeDJMediaEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_djmedia" initialData={initialData} label="🏢 DJ Media Intro">
      {(data, onChange) => (
        <div className="space-y-4">
          <FieldText
            label="Tên công ty (dùng \\n để xuống dòng)"
            value={String(data["companyTitle"] ?? "")}
            onChange={(v) => onChange("companyTitle", v)}
            textarea
            rows={2}
          />

          <FieldSectionLabel label="Ảnh carousel (tự động lướt, hỗ trợ 2+ ảnh)" />
          <MultiImageUpload
            label="Danh sách ảnh carousel"
            values={Array.isArray(data["images"]) ? (data["images"] as string[]) : []}
            onChange={(urls) => onChange("images", urls)}
            uploadType="cms-djmedia"
            hint="Thêm 2 ảnh trở lên để bật chế độ tự động lướt. Hover vào ảnh để sắp xếp hoặc xóa."
            maxImages={8}
          />

          <FieldSectionLabel label="Ảnh đơn (fallback nếu chưa có carousel)" />
          <ImageUpload
            label="Ảnh DJ Media (legacy)"
            value={String(data["imageUrl"] ?? "")}
            onChange={(url) => onChange("imageUrl", url)}
            uploadType="cms-djmedia"
            hint="Chỉ hiển thị khi danh sách carousel trống"
          />

          <FieldGrid cols={2}>
            <FieldText label="Badge kinh nghiệm - Giá trị" value={String(data["yearsExpValue"] ?? "")} onChange={(v) => onChange("yearsExpValue", v)} placeholder="7+" />
            <FieldText label="Badge kinh nghiệm - Nhãn" value={String(data["yearsExpLabel"] ?? "")} onChange={(v) => onChange("yearsExpLabel", v)} placeholder="Năm Kinh Nghiệm Thực Chiến" />
          </FieldGrid>
          <FieldText
            label="Mô tả công ty"
            value={String(data["description"] ?? "")}
            onChange={(v) => onChange("description", v)}
            textarea
            rows={4}
          />
          <FieldSectionLabel label="Hotline" />
          <FieldGrid cols={2}>
            <FieldText label="Nhãn hotline" value={String(data["hotlineLabel"] ?? "")} onChange={(v) => onChange("hotlineLabel", v)} />
            <FieldText label="Số hotline" value={String(data["hotlineNumber"] ?? "")} onChange={(v) => onChange("hotlineNumber", v)} placeholder="0828.118.789" />
          </FieldGrid>
          <FieldSectionLabel label="Mạng xã hội (URL)" />
          <FieldGrid cols={2}>
            <FieldText label="Facebook" value={String(data["socialFacebook"] ?? "")} onChange={(v) => onChange("socialFacebook", v)} />
            <FieldText label="TikTok" value={String(data["socialTiktok"] ?? "")} onChange={(v) => onChange("socialTiktok", v)} />
            <FieldText label="Instagram" value={String(data["socialInstagram"] ?? "")} onChange={(v) => onChange("socialInstagram", v)} />
            <FieldText label="Zalo" value={String(data["socialZalo"] ?? "")} onChange={(v) => onChange("socialZalo", v)} />
            <FieldText label="YouTube" value={String(data["socialYoutube"] ?? "")} onChange={(v) => onChange("socialYoutube", v)} />
          </FieldGrid>
        </div>
      )}
    </SectionSaveClient>
  );
}
