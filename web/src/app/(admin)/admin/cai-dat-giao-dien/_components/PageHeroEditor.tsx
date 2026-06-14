"use client";
import { useState } from "react";
import { FieldText } from "../trang-chu/_components/FieldInput";
import { ImageUpload } from "./ImageUpload";

interface Props {
  sectionKey: string;
  initialData: Record<string, unknown>;
  pageLabel: string;
  pageUrl: string;
}

export default function PageHeroEditor({ sectionKey, initialData, pageLabel, pageUrl }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function handleChange(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sectionKey, content: data }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi lưu");
      setMsg({ type: "ok", text: "Đã lưu!" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Hero section — {pageLabel}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Hiển thị đầu trang <code className="bg-gray-100 px-1 rounded">{pageUrl}</code></p>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <ImageUpload
          label="Thumbnail trang"
          value={String(data["thumbnail"] ?? "")}
          onChange={(url) => handleChange("thumbnail", url)}
          uploadType="cms-page"
          hint="Ảnh đại diện / hero image của trang"
        />
        <FieldText
          label="Badge"
          value={String(data["badge"] ?? "")}
          onChange={(v) => handleChange("badge", v)}
          hint="Nhãn nhỏ phía trên tiêu đề"
        />
        <FieldText
          label="Tiêu đề chính"
          value={String(data["title"] ?? "")}
          onChange={(v) => handleChange("title", v)}
          textarea
          rows={2}
        />
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldText
              label="Màu tiêu đề (hex)"
              value={String(data["titleColor"] ?? "")}
              onChange={(v) => handleChange("titleColor", v)}
              placeholder="#111827"
              hint="VD: #ef4444 đỏ · #0066ff xanh · #f59e0b vàng · để trống = màu mặc định"
            />
          </div>
          <div className="shrink-0 pb-1">
            <input
              type="color"
              value={String(data["titleColor"] ?? "#111827")}
              onChange={(e) => handleChange("titleColor", e.target.value)}
              className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
              title="Chọn màu"
            />
          </div>
        </div>
        <FieldText
          label="Subtitle (tùy chọn)"
          value={String(data["subtitle"] ?? "")}
          onChange={(v) => handleChange("subtitle", v)}
        />
        <FieldText
          label="Mô tả ngắn"
          value={String(data["description"] ?? "")}
          onChange={(v) => handleChange("description", v)}
          textarea
          rows={3}
        />
      </div>
    </div>
  );
}
