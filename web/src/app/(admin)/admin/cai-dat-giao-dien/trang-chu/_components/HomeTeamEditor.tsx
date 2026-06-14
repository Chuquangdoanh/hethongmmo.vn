"use client";
import { useState } from "react";
import SectionSaveClient from "./SectionSaveClient";
import { FieldText, FieldGrid, FieldSectionLabel } from "./FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";

interface TeamMember {
  name: string;
  title: string;
  imageUrl: string;
  badgeValue: string;
  badgeLabel: string;
  badgeColor: string;
  bio1: string;
  bio2: string;
  quote: string;
}

function MemberEditor({
  member,
  index,
  onChange,
}: {
  member: TeamMember;
  index: number;
  onChange: (updated: TeamMember) => void;
}) {
  function set(field: keyof TeamMember, value: string) {
    onChange({ ...member, [field]: value });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Thành viên {index + 1}</p>
      <FieldGrid cols={2}>
        <FieldText label="Tên" value={member.name} onChange={(v) => set("name", v)} />
        <FieldText label="Chức danh" value={member.title} onChange={(v) => set("title", v)} />
        <FieldText label="Màu badge (hex)" value={member.badgeColor} onChange={(v) => set("badgeColor", v)} placeholder="#0066ff" />
        <FieldText label="Badge — Giá trị" value={member.badgeValue} onChange={(v) => set("badgeValue", v)} placeholder="7+" />
        <FieldText label="Badge — Nhãn" value={member.badgeLabel} onChange={(v) => set("badgeLabel", v)} placeholder="Năm KN" />
      </FieldGrid>
      <ImageUpload
        label="Ảnh đại diện"
        value={member.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        uploadType="cms-team"
        hint="Ảnh chân dung thành viên"
      />
      <FieldText label="Bio 1" value={member.bio1} onChange={(v) => set("bio1", v)} textarea rows={3} />
      <FieldText label="Bio 2 (tùy chọn)" value={member.bio2} onChange={(v) => set("bio2", v)} textarea rows={2} />
      <FieldText label="Quote" value={member.quote} onChange={(v) => set("quote", v)} textarea rows={2} />
    </div>
  );
}

interface Props { initialData: Record<string, unknown>; }

export default function HomeTeamEditor({ initialData }: Props) {
  return (
    <SectionSaveClient sectionKey="home_team" initialData={initialData} label="👥 Đội ngũ sáng lập">
      {(data, onChange) => {
        const members = (data["members"] as TeamMember[]) ?? [];
        return (
          <div className="space-y-4">
            <FieldGrid cols={2}>
              <FieldText label="Nhãn section" value={String(data["sectionLabel"] ?? "")} onChange={(v) => onChange("sectionLabel", v)} />
              <FieldText label="Tiêu đề section" value={String(data["sectionTitle"] ?? "")} onChange={(v) => onChange("sectionTitle", v)} />
            </FieldGrid>
            <FieldSectionLabel label="Danh sách thành viên" />
            {members.map((m, i) => (
              <MemberEditor
                key={i}
                member={m}
                index={i}
                onChange={(updated) => {
                  const next = [...members];
                  next[i] = updated;
                  onChange("members", next);
                }}
              />
            ))}
          </div>
        );
      }}
    </SectionSaveClient>
  );
}
