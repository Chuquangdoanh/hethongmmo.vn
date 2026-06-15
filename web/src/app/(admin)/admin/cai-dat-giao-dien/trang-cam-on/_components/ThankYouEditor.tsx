"use client";
import { useState } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";

interface ThankYouData {
  badge: string;
  title: string;
  subtitle: string;
  message: string;
  iconType: string;
  btn1Text: string;
  btn1Href: string;
  btn2Text: string;
  btn2Href: string;
  supportTitle: string;
  supportDesc: string;
  telegramHref: string;
  telegramLabel: string;
  telegramUsername: string;
  fanpageHref: string;
  fanpageLabel: string;
  zaloHref: string;
  zaloLabel: string;
  hotlineNumber: string;
}

const PREVIEW_ICONS: { value: string; label: string; emoji: string }[] = [
  { value: "check",   label: "Dấu tích xanh",   emoji: "✅" },
  { value: "heart",   label: "Trái tim",         emoji: "❤️" },
  { value: "star",    label: "Ngôi sao",         emoji: "⭐" },
  { value: "rocket",  label: "Tên lửa",          emoji: "🚀" },
  { value: "gift",    label: "Quà tặng",         emoji: "🎁" },
];

export default function ThankYouEditor({
  sectionKey,
  initialData,
}: {
  sectionKey: string;
  initialData: Record<string, unknown>;
}) {
  const [data, setData] = useState<ThankYouData>({
    badge:        String(initialData["badge"] ?? ""),
    title:        String(initialData["title"] ?? ""),
    subtitle:     String(initialData["subtitle"] ?? ""),
    message:      String(initialData["message"] ?? ""),
    iconType:     String(initialData["iconType"] ?? "check"),
    btn1Text:     String(initialData["btn1Text"] ?? ""),
    btn1Href:     String(initialData["btn1Href"] ?? ""),
    btn2Text:     String(initialData["btn2Text"] ?? ""),
    btn2Href:     String(initialData["btn2Href"] ?? ""),
    supportTitle:     String(initialData["supportTitle"]     ?? ""),
    supportDesc:      String(initialData["supportDesc"]      ?? ""),
    telegramHref:     String(initialData["telegramHref"]     ?? ""),
    telegramLabel:    String(initialData["telegramLabel"]    ?? ""),
    telegramUsername: String(initialData["telegramUsername"] ?? ""),
    fanpageHref:      String(initialData["fanpageHref"]      ?? ""),
    fanpageLabel:     String(initialData["fanpageLabel"]     ?? ""),
    zaloHref:         String(initialData["zaloHref"]         ?? ""),
    zaloLabel:        String(initialData["zaloLabel"]        ?? ""),
    hotlineNumber:    String(initialData["hotlineNumber"]    ?? ""),
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function set(field: keyof ThankYouData, value: string) {
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
      setMsg({ type: "ok", text: "Đã lưu thành công!" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setSaving(false);
    }
  }

  const cardClass = "bg-white rounded-2xl border border-gray-200 p-6 space-y-5";
  const selectedIcon = PREVIEW_ICONS.find((i) => i.value === data.iconType);

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between sticky top-4 z-10 bg-gray-50/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
        <span className="text-sm font-semibold text-gray-700">Trang Cảm Ơn — Cài đặt giao diện</span>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
        </div>
      </div>

      {/* Preview mini */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl border border-blue-100 p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Xem trước</p>
        <div className="text-5xl">{selectedIcon?.emoji ?? "✅"}</div>
        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{data.badge || "Thành công"}</span>
        <h3 className="text-xl font-bold text-gray-900">{data.title || "Tiêu đề"}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{data.subtitle || "Phụ đề"}</p>
        <p className="text-xs text-gray-400 max-w-sm">{data.message || "Nội dung thông điệp..."}</p>
        <div className="flex gap-2 mt-1">
          <span className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold">{data.btn1Text || "Nút 1"}</span>
          <span className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg font-semibold">{data.btn2Text || "Nút 2"}</span>
        </div>
      </div>

      {/* Main content */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Nội dung chính</h2>

        {/* Icon picker */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Biểu tượng</p>
          <div className="flex gap-2 flex-wrap">
            {PREVIEW_ICONS.map((icon) => (
              <button
                key={icon.value}
                type="button"
                onClick={() => set("iconType", icon.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                  data.iconType === icon.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                <span>{icon.emoji}</span>
                <span>{icon.label}</span>
              </button>
            ))}
          </div>
        </div>

        <FieldText label="Badge (nhãn nhỏ)" value={data.badge} onChange={(v) => set("badge", v)} hint="VD: Thành công · Cảm ơn!" />
        <FieldText label="Tiêu đề lớn" value={data.title} onChange={(v) => set("title", v)} />
        <FieldText label="Phụ đề" value={data.subtitle} onChange={(v) => set("subtitle", v)} />
        <FieldText
          label="Thông điệp chi tiết"
          value={data.message}
          onChange={(v) => set("message", v)}
          textarea
          rows={3}
          hint="Mô tả chi tiết hơn về trạng thái đơn hàng / hành động tiếp theo"
        />
      </div>

      {/* Buttons */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Nút hành động</h2>
        <FieldSectionLabel label="Nút chính (màu xanh)" />
        <FieldGrid cols={2}>
          <FieldText label="Text nút 1" value={data.btn1Text} onChange={(v) => set("btn1Text", v)} placeholder="Về trang chủ" />
          <FieldText label="Link nút 1" value={data.btn1Href} onChange={(v) => set("btn1Href", v)} placeholder="/" />
        </FieldGrid>
        <FieldSectionLabel label="Nút phụ (viền)" />
        <FieldGrid cols={2}>
          <FieldText label="Text nút 2" value={data.btn2Text} onChange={(v) => set("btn2Text", v)} placeholder="Xem đơn hàng" />
          <FieldText label="Link nút 2" value={data.btn2Href} onChange={(v) => set("btn2Href", v)} placeholder="/don-hang" />
        </FieldGrid>
      </div>

      {/* Support section */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Khu vực hỗ trợ</h2>
        <FieldText label="Tiêu đề khu vực hỗ trợ" value={data.supportTitle} onChange={(v) => set("supportTitle", v)} placeholder="Cần hỗ trợ?" />
        <FieldText
          label="Mô tả hỗ trợ"
          value={data.supportDesc}
          onChange={(v) => set("supportDesc", v)}
          textarea
          rows={2}
        />
        <FieldSectionLabel label="Telegram" />
        <FieldGrid cols={2}>
          <FieldText label="Link Telegram" value={data.telegramHref} onChange={(v) => set("telegramHref", v)} placeholder="https://t.me/BossMeta789" />
          <FieldText label="Username (@...)" value={data.telegramUsername} onChange={(v) => set("telegramUsername", v)} placeholder="@BossMeta789" />
        </FieldGrid>

        <FieldSectionLabel label="Fanpage" />
        <FieldGrid cols={2}>
          <FieldText label="Link Fanpage" value={data.fanpageHref} onChange={(v) => set("fanpageHref", v)} placeholder="https://facebook.com/..." />
          <FieldText label="Tên Fanpage" value={data.fanpageLabel} onChange={(v) => set("fanpageLabel", v)} placeholder="Hệ Thống MMO" />
        </FieldGrid>

        <FieldSectionLabel label="Zalo" />
        <FieldGrid cols={2}>
          <FieldText label="Link Zalo" value={data.zaloHref} onChange={(v) => set("zaloHref", v)} placeholder="https://zalo.me/..." />
          <FieldText label="Nhãn hiển thị" value={data.zaloLabel} onChange={(v) => set("zaloLabel", v)} placeholder="Chat Zalo ngay" />
        </FieldGrid>

        <FieldSectionLabel label="Hotline" />
        <FieldText label="Số hotline" value={data.hotlineNumber} onChange={(v) => set("hotlineNumber", v)} placeholder="0393.118.789" hint="Hiển thị dạng text và dùng cho href tel:" />
      </div>
    </div>
  );
}
