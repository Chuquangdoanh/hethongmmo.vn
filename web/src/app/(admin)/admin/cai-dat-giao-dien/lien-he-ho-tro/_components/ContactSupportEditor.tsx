"use client";

import { useState } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";
import { SITE_CONTENT_KEYS } from "@/lib/services/site-content.keys";

interface ContactItem {
  platform: string;
  title: string;
  subtitle: string;
  href: string;
  bgColor: string;
}

interface ContactSupportData {
  buttonLabel: string;
  items: ContactItem[];
}

const PLATFORMS = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "zalo",     label: "Zalo",     color: "#0068FF" },
  { value: "tiktok",   label: "TikTok",   color: "#010101" },
  { value: "telegram", label: "Telegram", color: "#0088CC" },
  { value: "youtube",  label: "YouTube",  color: "#FF0000" },
  { value: "instagram",label: "Instagram",color: "#E1306C" },
  { value: "twitter",  label: "Twitter",  color: "#1DA1F2" },
];

const DEFAULT_ITEM: ContactItem = { platform: "telegram", title: "", subtitle: "", href: "", bgColor: "#0088CC" };

export default function ContactSupportEditor({ initialData }: { initialData: Record<string, unknown> }) {
  const [data, setData] = useState<ContactSupportData>({
    buttonLabel: String(initialData["buttonLabel"] ?? "Liên hệ hỗ trợ"),
    items: (initialData["items"] as ContactItem[] | undefined) ?? [],
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function setButtonLabel(v: string) {
    setData((prev) => ({ ...prev, buttonLabel: v }));
  }

  function updateItem(idx: number, patch: Partial<ContactItem>) {
    setData((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx]!, ...patch };
      return { ...prev, items };
    });
  }

  function removeItem(idx: number) {
    setData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  }

  function addItem() {
    setData((prev) => ({ ...prev, items: [...prev.items, { ...DEFAULT_ITEM }] }));
  }

  function onPlatformChange(idx: number, platform: string) {
    const preset = PLATFORMS.find((p) => p.value === platform);
    updateItem(idx, { platform, bgColor: preset?.color ?? "#000000" });
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: SITE_CONTENT_KEYS.CONTACT_SUPPORT, content: data }),
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

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between sticky top-4 z-10 bg-gray-50/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
        <span className="text-sm font-semibold text-gray-700">Liên hệ hỗ trợ — Cài đặt popup</span>
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

      {/* Preview */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 p-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Xem trước nút kích hoạt</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="pointer-events-none flex items-center gap-2 text-white text-[13px] font-bold rounded-full px-5 py-3"
            style={{ background: "linear-gradient(135deg,#1A1A1A,#1A1A1A)", boxShadow: "0 4px 20px rgba(99,102,241,.45)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
            </svg>
            {data.buttonLabel || "Liên hệ hỗ trợ"}
          </button>
          <div className="flex gap-2 flex-wrap">
            {data.items.map((item, i) => (
              <span
                key={i}
                className="text-white text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: item.bgColor }}
              >
                {item.platform || "?"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Button label */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Nút kích hoạt</h2>
        <FieldText
          label="Nhãn nút (text hiển thị)"
          value={data.buttonLabel}
          onChange={setButtonLabel}
          placeholder="Liên hệ hỗ trợ"
          hint='Văn bản hiển thị trên nút cố định góc phải màn hình'
        />
      </div>

      {/* Items */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Danh sách kênh liên hệ</h2>
        <p className="text-xs text-gray-500 -mt-2">Mỗi kênh hiển thị 1 dòng trong popup. Kéo để sắp xếp.</p>

        {data.items.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
            Chưa có kênh nào. Nhấn "Thêm kênh" để bắt đầu.
          </p>
        )}

        {data.items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block shrink-0"
                  style={{ background: item.bgColor }}
                />
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Kênh {idx + 1} — {item.platform || "chưa chọn"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
              >
                Xóa
              </button>
            </div>

            {/* Platform selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nền tảng</p>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onPlatformChange(idx, p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      item.platform === p.value
                        ? "border-transparent text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
                    }`}
                    style={item.platform === p.value ? { background: p.color, borderColor: p.color } : {}}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <FieldGrid cols={2}>
              <FieldText
                label="Tiêu đề"
                value={item.title}
                onChange={(v) => updateItem(idx, { title: v })}
                placeholder="Facebook Support"
              />
              <FieldText
                label="Mô tả phụ"
                value={item.subtitle}
                onChange={(v) => updateItem(idx, { subtitle: v })}
                placeholder="Fanpage hỗ trợ 24/7"
              />
            </FieldGrid>

            <FieldGrid cols={2}>
              <FieldText
                label="Link URL"
                value={item.href}
                onChange={(v) => updateItem(idx, { href: v })}
                placeholder="https://facebook.com/..."
              />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Màu nền icon</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.bgColor}
                    onChange={(e) => updateItem(idx, { bgColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={item.bgColor}
                    onChange={(e) => updateItem(idx, { bgColor: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="#1877F2"
                    maxLength={7}
                  />
                </div>
              </div>
            </FieldGrid>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-xl px-4 py-3 transition-colors hover:bg-blue-50"
        >
          + Thêm kênh liên hệ
        </button>
      </div>
    </div>
  );
}
