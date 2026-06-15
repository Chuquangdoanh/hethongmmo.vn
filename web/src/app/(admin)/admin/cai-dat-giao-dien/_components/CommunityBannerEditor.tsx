"use client";
import { useState } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../trang-chu/_components/FieldInput";
import { ColoredTitle } from "@/components/shared/ColoredTitle";

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
        <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
          Dùng <code className="bg-blue-100 px-1 rounded font-mono">{`["text"]`}</code> để tô màu một phần văn bản.{" "}
          VD: <code className="bg-blue-100 px-1 rounded font-mono">{`["HỆ THỐNG MMO"]`}</code> → chữ đó sẽ đổi màu trên trang public.
        </div>

        <div className="space-y-2">
          <FieldText
            label="Tiêu đề banner"
            value={String(data["communityTitle"] ?? "")}
            onChange={(v) => handleChange("communityTitle", v)}
            placeholder="CỘNG ĐỒNG MMO — HỆ THỐNG MMO 5.0"
            hint={`Dùng ' — ' để tách 2 dòng trên mobile. Dùng ["text"] để đổi màu phần tiêu đề.`}
          />
          {String(data["communityTitle"] ?? "") && (
            <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-dashed border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Xem trước</p>
              <p className="text-sm font-extrabold text-gray-800 leading-snug break-words">
                <ColoredTitle
                  text={String(data["communityTitle"] ?? "").split(" — ")[0] ?? ""}
                  accentColor={String(data["communityAccentColor"] ?? "#0066ff")}
                />
                {String(data["communityTitle"] ?? "").includes(" — ") && (
                  <> — <span style={{ color: String(data["communityHighlightColor"] ?? "#f97316") }}>
                    {String(data["communityTitle"] ?? "").split(" — ").slice(1).join(" — ")}
                  </span></>
                )}
              </p>
            </div>
          )}
        </div>

        <FieldSectionLabel label="🎨 Màu sắc accent" />
        <FieldGrid cols={2}>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FieldText
                  label="Màu chính (labels, link)"
                  value={String(data["communityAccentColor"] ?? "")}
                  onChange={(v) => handleChange("communityAccentColor", v)}
                  placeholder="#0066ff"
                  hint={`Màu cho ["text"] trong label và link. Mặc định: #0066ff`}
                />
              </div>
              <div className="shrink-0 pb-1">
                <input
                  type="color"
                  value={String(data["communityAccentColor"] ?? "#0066ff")}
                  onChange={(e) => handleChange("communityAccentColor", e.target.value)}
                  className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
                  title="Màu chính"
                />
              </div>
            </div>
            {String(data["communityAccentColor"] ?? "") && (
              <p className="mt-1 text-xs" style={{ color: String(data["communityAccentColor"] ?? "#0066ff") }}>
                ● Xem trước màu này
              </p>
            )}
          </div>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FieldText
                  label="Màu nổi bật (highlight)"
                  value={String(data["communityHighlightColor"] ?? "")}
                  onChange={(v) => handleChange("communityHighlightColor", v)}
                  placeholder="#f97316"
                  hint={`Màu cho supportText ["text"] và phần sau dấu " — " trong tiêu đề`}
                />
              </div>
              <div className="shrink-0 pb-1">
                <input
                  type="color"
                  value={String(data["communityHighlightColor"] ?? "#f97316")}
                  onChange={(e) => handleChange("communityHighlightColor", e.target.value)}
                  className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
                  title="Màu nổi bật"
                />
              </div>
            </div>
            {String(data["communityHighlightColor"] ?? "") && (
              <p className="mt-1 text-xs" style={{ color: String(data["communityHighlightColor"] ?? "#f97316") }}>
                ● Xem trước màu này
              </p>
            )}
          </div>
        </FieldGrid>

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
            placeholder='["HỆ THỐNG MMO"] - Telegram : @hethongmmo.vn (Hỗ trợ 24/7 mọi ngày)'
            hint='Dùng ["text"] để tô màu cam. VD: ["HỆ THỐNG MMO"] - Telegram...'
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

        <FieldSectionLabel label="📞 Card liên hệ hỗ trợ (sidebar trang Người Bán & Hệ Thống)" />
        <FieldText
          label="Tiêu đề card"
          value={String(data["contactTitle"] ?? "")}
          onChange={(v) => handleChange("contactTitle", v)}
          placeholder="Chăm sóc khách hàng Hệ Thống MMO"
        />
        <FieldGrid cols={2}>
          <FieldText
            label="Link Telegram"
            value={String(data["contactTelegramUrl"] ?? "")}
            onChange={(v) => handleChange("contactTelegramUrl", v)}
            placeholder="https://t.me/BossMeta789"
          />
          <FieldText
            label="Nhãn Telegram"
            value={String(data["contactTelegramLabel"] ?? "")}
            onChange={(v) => handleChange("contactTelegramLabel", v)}
            placeholder="@BossMeta789"
          />
        </FieldGrid>
        <FieldGrid cols={2}>
          <FieldText
            label="Link Facebook"
            value={String(data["contactFacebookUrl"] ?? "")}
            onChange={(v) => handleChange("contactFacebookUrl", v)}
            placeholder="https://www.facebook.com/..."
          />
          <FieldText
            label="Nhãn Facebook"
            value={String(data["contactFacebookLabel"] ?? "")}
            onChange={(v) => handleChange("contactFacebookLabel", v)}
            placeholder="HỆ THỐNG MMO"
          />
        </FieldGrid>
        <FieldText
          label="Giờ làm việc"
          value={String(data["contactHours"] ?? "")}
          onChange={(v) => handleChange("contactHours", v)}
          placeholder="08:00 – 23:00 hàng ngày"
        />
      </div>
    </div>
  );
}
