"use client";
import { useState } from "react";
import { FieldText, FieldGrid, FieldSectionLabel } from "../../trang-chu/_components/FieldInput";
import { ImageUpload } from "../../_components/ImageUpload";

interface NavLink { href: string; label: string }

interface FooterData {
  // CTA Banner
  ctaTitle: string;
  ctaSubtitle: string;
  ctaBtn1Text: string;
  ctaBtn1Href: string;
  ctaBtn2Text: string;
  ctaBtn2Href: string;
  // Brand
  brandDesc: string;
  // Socials
  socialFacebook: string;
  socialTiktok: string;
  socialYoutube: string;
  socialTelegram: string;
  socialZalo: string;
  // Stats
  stat1Value: string; stat1Label: string;
  stat2Value: string; stat2Label: string;
  stat3Value: string; stat3Label: string;
  // Links
  serviceLinks: NavLink[];
  supportLinks: NavLink[];
  // Contact
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  contactHours: string;
  contactTelegramHref: string;
  contactTelegramLabel: string;
  contactTelegramSub: string;
  // Copyright
  copyrightText: string;
  // Bộ Công Thương
  bctImageUrl: string;
  bctHref: string;
}

function LinkListEditor({
  label,
  links,
  onChange,
}: {
  label: string;
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
}) {
  function update(i: number, field: "href" | "label", value: string) {
    const next = links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l));
    onChange(next);
  }
  function add() {
    onChange([...links, { href: "/", label: "Link mới" }]);
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1 flex-1">{label}</p>
        <button
          type="button"
          onClick={add}
          className="ml-3 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0"
        >
          + Thêm link
        </button>
      </div>
      {links.map((link, i) => (
        <div key={i} className="flex items-end gap-2 bg-gray-50 rounded-lg p-3">
          <div className="flex-1">
            <FieldText
              label="Nhãn"
              value={link.label}
              onChange={(v) => update(i, "label", v)}
            />
          </div>
          <div className="flex-1">
            <FieldText
              label="Đường dẫn (href)"
              value={link.href}
              onChange={(v) => update(i, "href", v)}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mb-1 text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
            title="Xóa"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default function FooterEditor({
  sectionKey,
  initialData,
}: {
  sectionKey: string;
  initialData: Record<string, unknown>;
}) {
  const [data, setData] = useState<FooterData>({
    ctaTitle:     String(initialData["ctaTitle"] ?? ""),
    ctaSubtitle:  String(initialData["ctaSubtitle"] ?? ""),
    ctaBtn1Text:  String(initialData["ctaBtn1Text"] ?? ""),
    ctaBtn1Href:  String(initialData["ctaBtn1Href"] ?? ""),
    ctaBtn2Text:  String(initialData["ctaBtn2Text"] ?? ""),
    ctaBtn2Href:  String(initialData["ctaBtn2Href"] ?? ""),
    brandDesc:    String(initialData["brandDesc"] ?? ""),
    socialFacebook: String(initialData["socialFacebook"] ?? ""),
    socialTiktok:   String(initialData["socialTiktok"] ?? ""),
    socialYoutube:  String(initialData["socialYoutube"] ?? ""),
    socialTelegram: String(initialData["socialTelegram"] ?? ""),
    socialZalo:     String(initialData["socialZalo"] ?? ""),
    stat1Value: String(initialData["stat1Value"] ?? ""),
    stat1Label: String(initialData["stat1Label"] ?? ""),
    stat2Value: String(initialData["stat2Value"] ?? ""),
    stat2Label: String(initialData["stat2Label"] ?? ""),
    stat3Value: String(initialData["stat3Value"] ?? ""),
    stat3Label: String(initialData["stat3Label"] ?? ""),
    serviceLinks: (initialData["serviceLinks"] as NavLink[]) ?? [],
    supportLinks: (initialData["supportLinks"] as NavLink[]) ?? [],
    contactPhone:         String(initialData["contactPhone"] ?? ""),
    contactEmail:         String(initialData["contactEmail"] ?? ""),
    contactAddress:       String(initialData["contactAddress"] ?? ""),
    contactHours:         String(initialData["contactHours"] ?? ""),
    contactTelegramHref:  String(initialData["contactTelegramHref"] ?? ""),
    contactTelegramLabel: String(initialData["contactTelegramLabel"] ?? ""),
    contactTelegramSub:   String(initialData["contactTelegramSub"] ?? ""),
    copyrightText:        String(initialData["copyrightText"] ?? ""),
    bctImageUrl:          String(initialData["bctImageUrl"] ?? ""),
    bctHref:              String(initialData["bctHref"] ?? ""),
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function set(field: keyof FooterData, value: string) {
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

  return (
    <div className="space-y-6">
      {/* Save button (sticky) */}
      <div className="flex items-center justify-between sticky top-4 z-10 bg-gray-50/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
        <span className="text-sm font-semibold text-gray-700">Footer — Cài đặt giao diện</span>
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

      {/* CTA Banner */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Banner CTA</h2>
        <p className="text-xs text-gray-400 -mt-4">Dải banner kêu gọi hành động đầu footer</p>
        <FieldText label="Tiêu đề" value={data.ctaTitle} onChange={(v) => set("ctaTitle", v)} />
        <FieldText label="Mô tả" value={data.ctaSubtitle} onChange={(v) => set("ctaSubtitle", v)} />
        <FieldSectionLabel label="Nút bên trái" />
        <FieldGrid cols={2}>
          <FieldText label="Text nút 1" value={data.ctaBtn1Text} onChange={(v) => set("ctaBtn1Text", v)} />
          <FieldText label="Link nút 1" value={data.ctaBtn1Href} onChange={(v) => set("ctaBtn1Href", v)} />
        </FieldGrid>
        <FieldSectionLabel label="Nút bên phải" />
        <FieldGrid cols={2}>
          <FieldText label="Text nút 2" value={data.ctaBtn2Text} onChange={(v) => set("ctaBtn2Text", v)} />
          <FieldText label="Link nút 2" value={data.ctaBtn2Href} onChange={(v) => set("ctaBtn2Href", v)} />
        </FieldGrid>
      </div>

      {/* Brand + Socials */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Thương hiệu & Mạng xã hội</h2>
        <FieldText
          label="Mô tả thương hiệu"
          value={data.brandDesc}
          onChange={(v) => set("brandDesc", v)}
          textarea
          rows={3}
        />
        <FieldSectionLabel label="Đường dẫn mạng xã hội" />
        <FieldGrid cols={2}>
          <FieldText label="Facebook URL" value={data.socialFacebook} onChange={(v) => set("socialFacebook", v)} placeholder="https://facebook.com/..." />
          <FieldText label="TikTok URL" value={data.socialTiktok} onChange={(v) => set("socialTiktok", v)} placeholder="https://tiktok.com/@..." />
          <FieldText label="YouTube URL" value={data.socialYoutube} onChange={(v) => set("socialYoutube", v)} placeholder="https://youtube.com/@..." />
          <FieldText label="Telegram URL" value={data.socialTelegram} onChange={(v) => set("socialTelegram", v)} placeholder="https://t.me/..." />
          <FieldText label="Zalo URL" value={data.socialZalo} onChange={(v) => set("socialZalo", v)} placeholder="https://zalo.me/..." />
        </FieldGrid>
      </div>

      {/* Stats */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Thẻ thống kê (3 thẻ)</h2>
        <FieldGrid cols={2}>
          <FieldText label="Thẻ 1 — Giá trị" value={data.stat1Value} onChange={(v) => set("stat1Value", v)} placeholder="10.000+" />
          <FieldText label="Thẻ 1 — Nhãn" value={data.stat1Label} onChange={(v) => set("stat1Label", v)} placeholder="Học viên tin tưởng" />
          <FieldText label="Thẻ 2 — Giá trị" value={data.stat2Value} onChange={(v) => set("stat2Value", v)} placeholder="100%" />
          <FieldText label="Thẻ 2 — Nhãn" value={data.stat2Label} onChange={(v) => set("stat2Label", v)} placeholder="An toàn, bảo mật" />
          <FieldText label="Thẻ 3 — Giá trị" value={data.stat3Value} onChange={(v) => set("stat3Value", v)} placeholder="24/7" />
          <FieldText label="Thẻ 3 — Nhãn" value={data.stat3Label} onChange={(v) => set("stat3Label", v)} placeholder="Hỗ trợ tận tâm" />
        </FieldGrid>
      </div>

      {/* Service & Support links */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Danh sách liên kết</h2>
        <LinkListEditor
          label="Cột Dịch vụ"
          links={data.serviceLinks}
          onChange={(v) => setData((prev) => ({ ...prev, serviceLinks: v }))}
        />
        <LinkListEditor
          label="Cột Hỗ trợ"
          links={data.supportLinks}
          onChange={(v) => setData((prev) => ({ ...prev, supportLinks: v }))}
        />
      </div>

      {/* Contact */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Thông tin liên hệ</h2>
        <FieldGrid cols={2}>
          <FieldText label="Số điện thoại" value={data.contactPhone} onChange={(v) => set("contactPhone", v)} placeholder="0393.118.789" />
          <FieldText label="Email" value={data.contactEmail} onChange={(v) => set("contactEmail", v)} placeholder="email@gmail.com" />
          <FieldText label="Địa chỉ" value={data.contactAddress} onChange={(v) => set("contactAddress", v)} placeholder="Hà Nội, Việt Nam" />
          <FieldText label="Giờ làm việc" value={data.contactHours} onChange={(v) => set("contactHours", v)} placeholder="T2 - CN: 8:00 - 23:00" />
        </FieldGrid>
        <FieldSectionLabel label="Thẻ Telegram hỗ trợ" />
        <FieldGrid cols={2}>
          <FieldText label="Link Telegram" value={data.contactTelegramHref} onChange={(v) => set("contactTelegramHref", v)} placeholder="https://t.me/..." />
          <FieldText label="Nhãn Telegram" value={data.contactTelegramLabel} onChange={(v) => set("contactTelegramLabel", v)} />
        </FieldGrid>
        <FieldText label="Mô tả nhỏ (Telegram)" value={data.contactTelegramSub} onChange={(v) => set("contactTelegramSub", v)} hint="VD: Phản hồi trong vài phút" />
      </div>

      {/* Copyright */}
      <div className={cardClass}>
        <h2 className="text-base font-bold text-gray-800">Dòng bản quyền</h2>
        <FieldText
          label="Text bản quyền"
          value={data.copyrightText}
          onChange={(v) => set("copyrightText", v)}
          hint="VD: © 2026 hethongmmo.vn. Tất cả quyền được bảo lưu."
        />
      </div>

      {/* Bộ Công Thương */}
      <div className={cardClass}>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-800">Chứng nhận Bộ Công Thương</h2>
          <p className="text-xs text-gray-400">
            Logo hiển thị tại bottom bar. Tải ảnh lên để thay logo, xóa ảnh để ẩn logo. Nhập đường dẫn xác nhận để logo trở thành link click được.
          </p>
        </div>
        <ImageUpload
          label="Ảnh logo Bộ Công Thương"
          value={data.bctImageUrl}
          onChange={(v) => set("bctImageUrl", v)}
          uploadType="cms-footer-bct"
          hint="Để trống = ẩn logo khỏi footer. Khuyến nghị PNG nền trong suốt."
        />
        <FieldText
          label="Đường dẫn xác nhận BCT"
          value={data.bctHref}
          onChange={(v) => set("bctHref", v)}
          placeholder="http://online.gov.vn/Home/WebDetails/..."
          hint="Để trống = logo hiển thị nhưng không có link. Điền URL = logo thành link mở tab mới."
        />
      </div>
    </div>
  );
}
