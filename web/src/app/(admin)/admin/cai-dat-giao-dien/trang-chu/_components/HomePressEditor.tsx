"use client";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid, FieldSectionLabel } from "./FieldInput";

interface PressCard {
  logoType: string;
  tag: string;
  tagColor: string;
  headline: string;
  desc: string;
  date: string;
  href: string;
}

interface Props { initialData: Record<string, unknown>; }

export default function HomePressEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_press" initialData={initialData} label="📰 Báo chí">
      {(data, onChange) => {
        const cards = (data["cards"] as PressCard[]) ?? [];
        return (
          <div className="space-y-4">
            <FieldGrid cols={2}>
              <FieldText label="Badge" value={String(data["badge"] ?? "")} onChange={(v) => onChange("badge", v)} />
              <FieldText label="Tiêu đề" value={String(data["title"] ?? "")} onChange={(v) => onChange("title", v)} />
            </FieldGrid>
            <FieldText
              label="Subtitle (dùng \\n để xuống dòng)"
              value={String(data["subtitle"] ?? "")}
              onChange={(v) => onChange("subtitle", v)}
              textarea
              rows={2}
            />
            <FieldSectionLabel label="3 card báo chí" />
            {cards.map((c, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500">Card {i + 1}</p>
                <FieldGrid cols={2}>
                  <FieldText
                    label="Logo type"
                    value={c.logoType}
                    onChange={(v) => { const n = [...cards]; n[i] = { ...c, logoType: v }; onChange("cards", n); }}
                    hint="Báo Quốc Tế | VTV | Ngôi Sao VN (để đúng để hiện logo)"
                  />
                  <FieldText label="Tag" value={c.tag} onChange={(v) => { const n = [...cards]; n[i] = { ...c, tag: v }; onChange("cards", n); }} />
                  <FieldText label="Màu tag (hex)" value={c.tagColor} onChange={(v) => { const n = [...cards]; n[i] = { ...c, tagColor: v }; onChange("cards", n); }} />
                  <FieldText label="Ngày đăng" value={c.date} onChange={(v) => { const n = [...cards]; n[i] = { ...c, date: v }; onChange("cards", n); }} placeholder="22/04/2025" />
                </FieldGrid>
                <FieldText label="Headline" value={c.headline} onChange={(v) => { const n = [...cards]; n[i] = { ...c, headline: v }; onChange("cards", n); }} textarea rows={2} />
                <FieldText label="Mô tả ngắn" value={c.desc} onChange={(v) => { const n = [...cards]; n[i] = { ...c, desc: v }; onChange("cards", n); }} textarea rows={2} />
                <FieldText label="Link bài báo" value={c.href} onChange={(v) => { const n = [...cards]; n[i] = { ...c, href: v }; onChange("cards", n); }} />
              </div>
            ))}
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
