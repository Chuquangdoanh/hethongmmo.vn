"use client";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid, FieldSectionLabel } from "./FieldInput";

interface Props { initialData: Record<string, unknown>; }

export default function HomeHeroEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_hero" initialData={initialData} label="🚀 Hero Section">
      {(data, onChange) => (
        <div className="space-y-4">
          <FieldText
            label="Badge text"
            value={String(data["badge"] ?? "")}
            onChange={(v) => onChange("badge", v)}
            placeholder="Hệ thống MMO 5.0 chính thức ra mắt"
            hint="Dòng chữ nhỏ phía trên tiêu đề"
          />
          <FieldText
            label="Tiêu đề chính (dùng \\n để xuống dòng)"
            value={String(data["title"] ?? "")}
            onChange={(v) => onChange("title", v)}
            textarea
            rows={2}
            placeholder="HỆ THỐNG MMO &\nTÀI NGUYÊN SỐ 5.0"
          />
          <FieldText
            label="Mô tả ngắn"
            value={String(data["description"] ?? "")}
            onChange={(v) => onChange("description", v)}
            textarea
            rows={2}
          />
          <FieldText
            label="URL ảnh hero"
            value={String(data["imageUrl"] ?? "")}
            onChange={(v) => onChange("imageUrl", v)}
            placeholder="/images/hethongmmo.png"
          />
          <FieldSectionLabel label="Floating chips" />
          <FieldGrid cols={2}>
            <FieldText label="Chip 1 — Giá trị" value={String(data["chip1Value"] ?? "")} onChange={(v) => onChange("chip1Value", v)} placeholder="99.9%" />
            <FieldText label="Chip 1 — Nhãn" value={String(data["chip1Label"] ?? "")} onChange={(v) => onChange("chip1Label", v)} placeholder="Hài lòng" />
            <FieldText label="Chip 2 — Giá trị" value={String(data["chip2Value"] ?? "")} onChange={(v) => onChange("chip2Value", v)} placeholder="7+" />
            <FieldText label="Chip 2 — Nhãn" value={String(data["chip2Label"] ?? "")} onChange={(v) => onChange("chip2Label", v)} placeholder="Năm KN" />
          </FieldGrid>
          <FieldSectionLabel label="Nút CTA" />
          <FieldGrid cols={2}>
            <FieldText label="Nút 1 — Text" value={String(data["btn1Text"] ?? "")} onChange={(v) => onChange("btn1Text", v)} />
            <FieldText label="Nút 1 — Link" value={String(data["btn1Href"] ?? "")} onChange={(v) => onChange("btn1Href", v)} />
            <FieldText label="Nút 2 — Text" value={String(data["btn2Text"] ?? "")} onChange={(v) => onChange("btn2Text", v)} />
            <FieldText label="Nút 2 — Link" value={String(data["btn2Href"] ?? "")} onChange={(v) => onChange("btn2Href", v)} />
          </FieldGrid>
        </div>
      )}
    </SectionSaveClient>
  );
}
