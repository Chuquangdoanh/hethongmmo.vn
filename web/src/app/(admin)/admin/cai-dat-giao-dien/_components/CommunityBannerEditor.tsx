"use client";
import { useState } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../trang-chu/_components/FieldInput";

interface Props {
  sectionKey: string;
  initialData: Record<string, unknown>;
}

export function CommunityBannerEditor({ sectionKey, initialData }: Props) {
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
        credentials: "include",
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
          <h2 className="text-base font-bold text-gray-800">🌐 Cộng đồng MMO Banner</h2>
          <p className="text-xs text-gray-400 mt-0.5">Hiển thị đầu trang <code className="bg-gray-100 px-1 rounded">/tai-nguyen-mmo</code></p>
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
        <FieldText
          label="Tiêu đề banner"
          value={String(data["communityTitle"] ?? "")}
          onChange={(v) => handleChange("communityTitle", v)}
          placeholder="CỘNG ĐỒNG MMO — HỆ THỐNG MMO 5.0"
          hint="Dùng ' — ' để tách 2 dòng trên mobile: phần trước màu đen, phần sau màu cam"
        />

        <FieldSectionLabel label="🔹 Nhóm Telegram" />
        <FieldGrid cols={2}>
          <FieldText
            label="Nhãn"
            value={String(data["communityTelegramLabel"] ?? "")}
            onChange={(v) => handleChange("communityTelegramLabel", v)}
            placeholder="Nhóm Telegram – Cộng đồng Update Biến Chuyển Meta"
          />
          <FieldText
            label="Link URL"
            value={String(data["communityTelegramUrl"] ?? "")}
            onChange={(v) => handleChange("communityTelegramUrl", v)}
            placeholder="https://t.me/hethongmmovn"
          />
        </FieldGrid>

        <FieldSectionLabel label="🔹 Chăm sóc khách hàng" />
        <FieldGrid cols={2}>
          <FieldText
            label="Nhãn mục"
            value={String(data["communitySupportLabel"] ?? "")}
            onChange={(v) => handleChange("communitySupportLabel", v)}
            placeholder="Chăm sóc khách hàng"
          />
          <FieldText
            label="Nội dung hiển thị"
            value={String(data["communitySupportText"] ?? "")}
            onChange={(v) => handleChange("communitySupportText", v)}
            placeholder="HỆ THỐNG MMO - Telegram : @hethongmmo.vn (Hỗ trợ 24/7 mọi ngày)"
          />
        </FieldGrid>

        <FieldSectionLabel label="🔹 Cộng đồng MMO" />
        <FieldGrid cols={2}>
          <FieldText
            label="Nhãn mục"
            value={String(data["communityGroupLabel"] ?? "")}
            onChange={(v) => handleChange("communityGroupLabel", v)}
            placeholder="Cộng Đồng MMO"
          />
          <FieldText
            label="Mô tả"
            value={String(data["communityGroupDesc"] ?? "")}
            onChange={(v) => handleChange("communityGroupDesc", v)}
            placeholder="Nơi giao lưu, chia sẻ kiến thức..."
          />
        </FieldGrid>

        <FieldSectionLabel label="🔹 Fanpage chính thức" />
        <FieldGrid cols={2}>
          <FieldText
            label="Nhãn mục"
            value={String(data["communityFanpageLabel"] ?? "")}
            onChange={(v) => handleChange("communityFanpageLabel", v)}
            placeholder="Kênh Fanpage Chính Thức"
          />
          <FieldText
            label="Link URL"
            value={String(data["communityFanpageUrl"] ?? "")}
            onChange={(v) => handleChange("communityFanpageUrl", v)}
            placeholder="https://www.facebook.com/hethongmmo.vn/"
          />
        </FieldGrid>
      </div>
    </div>
  );
}
