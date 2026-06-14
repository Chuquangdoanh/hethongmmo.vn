"use client";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid } from "./FieldInput";

interface StatItem {
  value: string;
  count: number | null;
  suffix: string;
  label: string;
}

interface Props { initialData: Record<string, unknown>; }

export default function HomeStatsEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_stats" initialData={initialData} label="📊 Thống kê">
      {(data, onChange) => {
        const stats = (data["stats"] as StatItem[]) ?? [];
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Chỉnh sửa 5 chỉ số thống kê trên banner tối</p>
            {stats.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-3">Chỉ số {i + 1}</p>
                <FieldGrid cols={2}>
                  <FieldText
                    label="Giá trị hiển thị"
                    value={s.value}
                    onChange={(v) => {
                      const next = [...stats];
                      next[i] = { ...s, value: v };
                      onChange("stats", next);
                    }}
                    placeholder="59.639+"
                  />
                  <FieldText
                    label="Nhãn"
                    value={s.label}
                    onChange={(v) => {
                      const next = [...stats];
                      next[i] = { ...s, label: v };
                      onChange("stats", next);
                    }}
                    placeholder="Khách hàng"
                  />
                  <FieldText
                    label="Count (số nguyên, để rỗng nếu không đếm)"
                    value={s.count !== null ? String(s.count) : ""}
                    onChange={(v) => {
                      const next = [...stats];
                      next[i] = { ...s, count: v === "" ? null : Number(v) };
                      onChange("stats", next);
                    }}
                    placeholder="59639"
                  />
                  <FieldText
                    label="Suffix (+ hoặc %)"
                    value={s.suffix}
                    onChange={(v) => {
                      const next = [...stats];
                      next[i] = { ...s, suffix: v };
                      onChange("stats", next);
                    }}
                    placeholder="+"
                  />
                </FieldGrid>
              </div>
            ))}
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
