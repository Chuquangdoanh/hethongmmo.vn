"use client";

import { useState, useRef, useEffect } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";
import { SITE_CONTENT_KEYS } from "@/lib/services/site-content.keys";

function InfoPopup({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full border border-gray-300 bg-white text-gray-500 text-[11px] font-bold flex items-center justify-center hover:border-blue-400 hover:text-blue-600 transition-colors"
        title="Thông tin"
      >
        i
      </button>
      {open && (
        <div className="absolute left-7 top-0 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-1.5">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Hiển thị tại</p>
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <p className="text-xs text-gray-700 leading-snug">{line}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ContactItem {
  platform: string;
  title: string;
  subtitle: string;
  href: string;
  bgColor: string;
}

interface QuickButton {
  id: string;
  label: string;
  href: string;
}

interface ContactSupportData {
  buttonLabel: string;
  items: ContactItem[];
  quickButtons: QuickButton[];
}

const DEFAULT_QUICK_BTN: QuickButton = { id: "", label: "Liên hệ ngay", href: "" };

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
    quickButtons: (initialData["quickButtons"] as QuickButton[] | undefined) ?? [],
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

  function addQuickBtn() {
    setData((prev) => ({ ...prev, quickButtons: [...prev.quickButtons, { ...DEFAULT_QUICK_BTN }] }));
  }

  function updateQuickBtn(idx: number, patch: Partial<QuickButton>) {
    setData((prev) => {
      const quickButtons = [...prev.quickButtons];
      quickButtons[idx] = { ...quickButtons[idx]!, ...patch };
      return { ...prev, quickButtons };
    });
  }

  function removeQuickBtn(idx: number) {
    setData((prev) => ({ ...prev, quickButtons: prev.quickButtons.filter((_, i) => i !== idx) }));
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
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">Nút kích hoạt</h2>
          <InfoPopup lines={[
            "Nút tròn cố định góc dưới phải màn hình trên toàn bộ trang public",
            "Khi click mở popup danh sách kênh liên hệ bên dưới",
          ]} />
        </div>
        <FieldText
          label="Nhãn nút (text hiển thị)"
          value={data.buttonLabel}
          onChange={setButtonLabel}
          placeholder="Liên hệ hỗ trợ"
          hint='Văn bản hiển thị trên nút cố định góc phải màn hình'
        />
      </div>

      {/* Quick Buttons */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">Nút liên hệ nhanh trên trang</h2>
          <InfoPopup lines={[
            'ID "product" → sidebar trang sản phẩm tài nguyên MMO (/tai-nguyen-mmo/[slug])',
            'ID "product" → sidebar trang sản phẩm kho tài nguyên (/kho-tai-nguyen/[slug])',
            'ID "product" → trang chi tiết sản phẩm (/tai-nguyen-mmo/san-pham/[id])',
            'ID "product" → trang chi tiết sản phẩm kho (/kho-tai-nguyen/san-pham/[id])',
            'ID "course" → sidebar trang khóa học (/khoa-hoc/[slug])',
            'ID "telegram" → Sidebar menu "Telegram cộng đồng" (user đã đăng nhập)',
            'ID "telegram" → Trang chính sách nhà bán hàng (/chinh-sach-nha-ban-hang)',
            'ID "telegram" → Trang điều khoản dịch vụ (/dieu-khoan)',
            'ID "telegram" → Trang giới thiệu — nhóm cộng đồng (/gioi-thieu)',
            'ID "telegram" → Popup sau đăng ký dịch vụ Networks (/NetWorks)',
          ]} />
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Dùng <code className="bg-gray-100 px-1 rounded">id</code> để phân biệt vị trí. Nhấn <span className="font-bold">i</span> để xem ID nào áp dụng cho trang nào.
        </p>

        {data.quickButtons.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
            Chưa có nút nào. Nhấn "Thêm nút" để bắt đầu.
          </p>
        )}

        {data.quickButtons.map((btn, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Nút {idx + 1}{btn.id ? ` — ID: ${btn.id}` : ""}
              </p>
              <button
                type="button"
                onClick={() => removeQuickBtn(idx)}
                className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
              >
                Xóa
              </button>
            </div>
            <FieldGrid cols={3}>
              <FieldText
                label="ID (định danh)"
                value={btn.id}
                onChange={(v) => updateQuickBtn(idx, { id: v.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="product / course / ..."
                hint="Pages dùng ID này để tìm đúng nút"
              />
              <FieldText
                label="Nhãn nút"
                value={btn.label}
                onChange={(v) => updateQuickBtn(idx, { label: v })}
                placeholder="Liên hệ ngay"
              />
              <FieldText
                label="Link URL"
                value={btn.href}
                onChange={(v) => updateQuickBtn(idx, { href: v })}
                placeholder="https://t.me/..."
              />
            </FieldGrid>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuickBtn}
          className="w-full text-sm font-semibold text-emerald-600 hover:text-emerald-800 border border-emerald-300 rounded-xl px-4 py-3 transition-colors hover:bg-emerald-50"
        >
          + Thêm nút liên hệ nhanh
        </button>
      </div>

      {/* Items */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">Danh sách kênh liên hệ</h2>
          <InfoPopup lines={[
            "Hiển thị trong popup khi user click nút kích hoạt (góc dưới phải màn hình)",
            "Áp dụng trên toàn bộ trang public — mỗi kênh là 1 dòng trong popup",
            "Thứ tự hiển thị theo thứ tự danh sách bên dưới",
          ]} />
        </div>
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
