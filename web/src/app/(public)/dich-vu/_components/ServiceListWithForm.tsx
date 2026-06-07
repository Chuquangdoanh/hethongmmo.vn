"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { randomUUID } from "@/lib/utils/uuid";
import {
  Users, Clock, CheckCircle, Zap,
  Star, ShoppingCart, Upload, X,
  Phone, Link2, Smartphone, Mail, KeyRound,
  Shield, AlertTriangle, Tag, MessageSquare, Send,
  BadgeCheck, Package,
} from "lucide-react";
import TestimonialsSection, { type TestimonialItem } from "@/components/shared/TestimonialsSection";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "Twitter (X)", ICLOUD: "iCloud", OTHER: "Khác",
};
const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK:  "https://svgl.app/library/facebook-icon.svg",
  TIKTOK:    "https://svgl.app/library/tiktok-icon-light.svg",
  GOOGLE:    "https://svgl.app/library/google.svg",
  INSTAGRAM: "https://svgl.app/library/instagram-icon.svg",
  YOUTUBE:   "https://svgl.app/library/youtube.svg",
  ICLOUD:    "https://svgl.app/library/icloud.svg",
  ZALO:      "https://svgl.app/library/zalo.svg",
  TELEGRAM:  "https://svgl.app/library/telegram.svg",
  TWITTER:   "https://svgl.app/library/x.svg",
};

interface WarrantyOption { name: string; price: number; }
interface DeviceVariant { name: string; price: number; }

interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  platform: string;
  category: string;
  price: string;
  successRate: number;
  processingTime: string | null;
  rating: number;
  totalOrders: number;
  customerCount: number;
  totalViews: number;
  isFeatured: boolean;
  description: string | null;
  warrantyOptions: WarrantyOption[];
  deviceVariants: DeviceVariant[];
  requiresAccountType: boolean;
  requiresCccd: boolean;
}


function ServiceCard({
  service,
  isSelected,
  onSelect,
  discountPct = 0,
}: {
  service: ServiceItem;
  isSelected: boolean;
  onSelect: () => void;
  discountPct?: number;
}) {
  const [showImage, setShowImage] = useState(false);
  const price    = Number(service.price);
  const minPrice = service.deviceVariants.length > 0
    ? Math.min(...service.deviceVariants.map((v) => v.price))
    : price;
  const hasVariants = service.deviceVariants.length > 0;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-[#0066ff]/40 hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] duration-300 group ${
        isSelected ? "border-[#0d9488] ring-2 ring-[#0d9488]/20" : "border-[#e2e8f0]"
      }`}
    >
      {/* HOT badge */}
      {service.isFeatured && (
        <span className="absolute top-0 right-0 px-3 py-1 text-[10px] font-extrabold bg-[#ef4444] text-white uppercase tracking-wider rounded-bl-xl rounded-tr-2xl z-10">
          HOT
        </span>
      )}

      {/* ── CHẾ ĐỘ XEM ẢNH: ẩn toàn bộ thông tin, chỉ hiện ảnh ── */}
      {showImage && service.thumbnail ? (
        <div className="flex flex-col flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={service.thumbnail}
            alt={service.name}
            className="w-full flex-1 object-cover"
            style={{ minHeight: "220px" }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowImage(false); }}
            className="w-full py-2.5 text-xs font-bold text-[#475569] bg-[#f8fafc] border-t border-[#e2e8f0] hover:text-[#0066ff] transition-colors"
          >
            ← Quay lại thông tin
          </button>
        </div>
      ) : (
        /* ── CHẾ ĐỘ THÔNG THƯỜNG ── */
        <div className="flex flex-col flex-1 p-3 gap-5">

          {/* Row 1: Tên + Rating chip */}
          <div className="flex items-start justify-between gap-2 pr-12">
            <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug flex-1 group-hover:text-[#0066ff] transition-colors">
              {service.name}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#000000] text-white shrink-0">
              <Star size={10} strokeWidth={0} fill="#f59e0b" /> {service.rating.toFixed(1)}
            </span>
          </div>

          {/* Row 2: Category + Xem ảnh button (cạnh nhau) */}
          <div className="flex items-center gap-1.5 flex-wrap -mt-3">
            {service.category && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                {service.category}
              </span>
            )}
            {service.thumbnail && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowImage(true); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-[#e2e8f0] text-[#475569] hover:border-[#0066ff] hover:text-[#0066ff] transition-colors"
              >
                🖼 Xem ảnh
              </button>
            )}
          </div>

          {/* Row 3: Stats */}
          <div className="flex items-center gap-3 text-[11px] text-[#64748b] flex-wrap -mt-3">
            <span className="inline-flex items-center gap-1">
              <Users size={11} strokeWidth={2} className="text-[#0066ff]" />
              <span className="font-semibold text-[#0f172a]">{service.customerCount.toLocaleString("vi-VN")}</span> khách hàng
            </span>
            <span className="inline-flex items-center gap-1">
              <Package size={11} strokeWidth={2} className="text-[#10b981]" />
              <span className="font-semibold text-[#0f172a]">{service.totalOrders.toLocaleString("vi-VN")}</span> đơn
            </span>
          </div>

          {/* Info card */}
          <div className="flex flex-col gap-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2 text-[11px] -mt-3">
            {service.processingTime && (
              <span className="flex items-center gap-1.5 text-[#475569]">
                <Clock size={11} strokeWidth={2} className="text-[#7C3AED] shrink-0" />
                <span className="text-[#7C3AED] font-medium">Thời gian xử lý</span>
                <span className="font-medium">{service.processingTime}</span>
              </span>
            )}
            {service.warrantyOptions.length > 0 && (
              <span className="flex items-center gap-1.5 text-[#475569]">
                <Shield size={11} strokeWidth={2} className="text-[#059669] shrink-0" />
                <span className="text-[#059669] font-medium">Bảo hành</span>
                <span className="font-medium">{service.warrantyOptions[0]?.name}</span>
              </span>
            )}
            <div className="pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#64748b]">Tỉ lệ thành công</span>
                <span className="font-bold text-[#059669]">{service.successRate}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]" style={{ width: `${service.successRate}%` }} />
              </div>
            </div>
          </div>

          {/* Device variants */}
          {hasVariants && (
            <div className="flex flex-wrap gap-1 -mt-3">
              {service.deviceVariants.slice(0, 3).map((v) => (
                <span key={v.name} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#ede9fe] text-[#7c3aed]">
                  {v.name}
                </span>
              ))}
              {service.deviceVariants.length > 3 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] text-[#94a3b8]">+{service.deviceVariants.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Giá + CTA */}
          <div className="flex items-stretch gap-2">
            <div className="flex-[2] flex flex-col items-center justify-center rounded-xl border-2 border-[#e11d48] px-2 py-2 gap-0.5">
              {discountPct > 0 && price > 0 && (
                <p className="text-[10px] text-[#94a3b8] line-through leading-tight">
                  {hasVariants ? `Từ ${formatVnd(minPrice)}` : formatVnd(price)}
                </p>
              )}
              <p className="text-sm font-extrabold text-center leading-tight text-[#e11d48]">
                {hasVariants
                  ? `Từ ${formatVnd(discountPct > 0 ? Math.round(minPrice * (1 - discountPct / 100)) : minPrice)}`
                  : formatVnd(discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price)}
              </p>
              {discountPct > 0 && price > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">-{discountPct}%</span>
              )}
            </div>
            <button
              type="button"
              onClick={onSelect}
              className={`flex-[3] flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                isSelected
                  ? "bg-[#be123c] text-white shadow-md"
                  : "bg-[#e11d48] text-white hover:bg-[#be123c] hover:shadow-md"
              }`}
            >
              <ShoppingCart size={13} strokeWidth={2} />
              {isSelected ? "✓ Đang chọn" : "Đặt hàng ngay"}
            </button>
          </div>

        </div>
      )}
    </article>
  );
}

function ServiceOrderPanel({
  service,
  isLoggedIn,
  onClose,
  onSuccess,
  testimonials,
  autoScroll,
  discountPct = 0,
}: {
  service: ServiceItem;
  isLoggedIn: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  testimonials: TestimonialItem[];
  autoScroll: boolean;
  discountPct?: number;
}) {
  const router = useRouter();
  const cccdInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isICloud = service.platform === "ICLOUD";
  const hasDeviceVariants = service.deviceVariants.length > 0;
  const price = Number(service.price);

  const [deviceVariant, setDeviceVariant] = useState<string>(
    service.deviceVariants.length === 1 ? (service.deviceVariants[0]?.name ?? "") : ""
  );
  const [form, setForm] = useState({
    imeiOrLink: "",
    accountPass: "",
    gmailPass: "",
    zaloPhone: "",
    accountType: "chinh_chu" as "chinh_chu" | "khong_chinh_chu",
    warranty: "",
    note: "",
  });
  const [cccdUrl, setCccdUrl] = useState("");
  const [cccdUploading, setCccdUploading] = useState(false);
  const [cccdError, setCccdError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError]           = useState("");
  const [phoneTouched, setPhoneTouched]       = useState(false);
  const [warrantyError, setWarrantyError]     = useState("");
  const [warrantyTouched, setWarrantyTouched] = useState(false);
  const [cccdFieldError, setCccdFieldError]   = useState("");
  const [linkError, setLinkError]             = useState("");
  const [linkTouched, setLinkTouched]         = useState(false);
  const [gmailError, setGmailError]           = useState("");
  const [gmailTouched, setGmailTouched]       = useState(false);

  useEffect(() => {
    if (!autoScroll) return;
    const el = panelRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      const headerEl = document.querySelector<HTMLElement>(".main-header-shell") ?? document.querySelector("header");
      const headerH  = headerEl ? headerEl.getBoundingClientRect().height : 80;
      const target   = el.getBoundingClientRect().top + window.scrollY - headerH - 20;

      // Custom slow scroll — 900ms ease-out cubic (browser smooth không kiểm soát tốc độ)
      const start    = window.scrollY;
      const distance = target - start;
      const duration = 900;
      const startTime = performance.now();

      function step(now: number) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        window.scrollTo(0, start + distance * ease);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, 120);

    return () => clearTimeout(timer);
  }, [autoScroll]);

  const selectedVariant = service.deviceVariants.find(v => v.name === deviceVariant);
  const basePrice = selectedVariant ? selectedVariant.price : price;
  const warrantyPrice = service.warrantyOptions.find((w) => w.name === form.warranty)?.price ?? 0;
  const total = basePrice + warrantyPrice;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateLink(value: string): string {
    const v = value.trim();
    if (!v) return "Vui lòng nhập thông tin này.";
    if (isICloud && !/^\d{14,16}$/.test(v)) return "IMEI không hợp lệ — cần 14–16 chữ số.";
    if (!isICloud && !/^https?:\/\/.+/.test(v)) return "Link không hợp lệ — phải bắt đầu bằng https://";
    return "";
  }

  function validateGmail(value: string): string {
    const v = value.trim();
    if (!v) return "";
    const email = v.split("|")[0]?.split(":")[0]?.trim() ?? v;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Gmail không đúng định dạng (VD: ten@gmail.com:matkhau).";
    return "";
  }

  function validatePhone(value: string): string {
    if (!value.trim()) return "Vui lòng nhập số điện thoại Zalo liên hệ.";
    if (!/^(0|\+84)[3-9]\d{8}$/.test(value.trim())) return "Số điện thoại không hợp lệ (VD: 0901234567).";
    return "";
  }

  function validateWarranty(value: string): string {
    if (service.warrantyOptions.length > 0 && !value) return "Vui lòng chọn chế độ bảo hành.";
    return "";
  }

  async function handleCccdFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCccdError("");
    const fd = new FormData();
    fd.append("file", file);
    setCccdUploading(true);
    try {
      const res = await fetch("/api/user/upload?type=cccd", { method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setCccdError(json.error ?? "Upload thất bại"); return; }
      setCccdUrl(json.data?.url ?? "");
    } finally {
      setCccdUploading(false);
      if (cccdInputRef.current) cccdInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) { router.push("/dang-nhap"); return; }
    if (hasDeviceVariants && !deviceVariant) {
      setError("Vui lòng chọn thiết bị cần xử lý."); return;
    }
    const lErr = validateLink(form.imeiOrLink);
    const pErr = validatePhone(form.zaloPhone);
    const gErr = validateGmail(form.gmailPass);
    const wErr = validateWarranty(form.warranty);
    const cErr = (!isICloud && service.requiresCccd && !cccdUrl) ? "Vui lòng tải lên ảnh CCCD mặt trước." : "";
    setLinkTouched(true);    setLinkError(lErr);
    setPhoneTouched(true);   setPhoneError(pErr);
    setGmailTouched(true);   setGmailError(gErr);
    setWarrantyTouched(true); setWarrantyError(wErr);
    setCccdFieldError(cErr);
    if (lErr || pErr || gErr || wErr || cErr) return;
    setError("");
    setLoading(true);
    try {
      const customerNote = JSON.stringify({
        ...(isICloud ? { imei: form.imeiOrLink.trim() || undefined } : { link: form.imeiOrLink.trim() || undefined }),
        accountPass: form.accountPass.trim() || undefined,
        gmailPass: form.gmailPass.trim() || undefined,
        zaloPhone: form.zaloPhone.trim(),
        accountType: (!isICloud && service.requiresAccountType) ? form.accountType : undefined,
        cccdUrl: (!isICloud && service.requiresCccd) ? (cccdUrl || undefined) : undefined,
        note: form.note.trim() || undefined,
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "SERVICE",
          itemId: service.id,
          warrantyVariant: form.warranty || undefined,
          deviceVariant: deviceVariant || undefined,
          customerNote,
          idempotencyKey: randomUUID(),
        }),
      });
      const json = await res.json() as { data?: { orderId?: string }; error?: string };
      if (!res.ok || !json.data?.orderId) { setError(json.error ?? "Đặt hàng thất bại, thử lại sau."); return; }
      onSuccess(json.data.orderId);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={panelRef} className="col-span-full mt-2 scroll-mt-24 panel-fade-in">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e40af] to-[#7C3AED] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Zap size={20} strokeWidth={1.75} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{service.name}</h2>
              <p className="text-[11px] text-white/70">{PLATFORM_LABELS[service.platform] ?? service.platform} · {service.category}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X size={14} strokeWidth={2.5} className="text-white" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="px-6 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] font-semibold">
            <Star size={12} strokeWidth={0} fill="#f59e0b" className="text-[#f59e0b]" />
            {service.rating.toFixed(1)}/5
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] font-semibold">
            <CheckCircle size={12} strokeWidth={2} className="text-[#10b981]" />
            {service.successRate}% thành công
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] font-semibold">
            <Users size={12} strokeWidth={2} className="text-[#0066ff]" />
            {service.customerCount.toLocaleString("vi-VN")} khách hàng
          </span>
          {service.processingTime && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] font-semibold">
              <Clock size={12} strokeWidth={2} className="text-[#f59e0b]" />
              {service.processingTime}
            </span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">

          {/* Device variant selection */}
          {hasDeviceVariants && (
            <div className="rounded-xl border-2 border-[#7C3AED]/30 bg-[#7C3AED]/3 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <label className="text-xs font-bold text-[#7C3AED] uppercase tracking-wide">Thiết Bị Cần Mở *</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.deviceVariants.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setDeviceVariant(v.name)}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                      deviceVariant === v.name
                        ? "border-[#7C3AED] bg-[#7C3AED]/8 shadow-sm"
                        : "border-[#e2e8f0] bg-white hover:border-[#7C3AED]/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-[#0f172a] truncate w-full">{v.name}</span>
                    <span className={`text-sm font-extrabold mt-0.5 ${deviceVariant === v.name ? "text-[#7C3AED]" : "text-[#EF4444]"}`}>
                      {formatVnd(v.price)}
                    </span>
                  </button>
                ))}
              </div>
              {!deviceVariant && (
                <p className="text-[10px] text-[#7C3AED]/70">Chọn thiết bị để xem giá chính xác</p>
              )}
            </div>
          )}

          {/* Main fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* IMEI / Link */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5 flex items-center gap-1.5">
                {isICloud
                  ? <><Smartphone size={12} strokeWidth={2} className="text-[#7c3aed]" /> IMEI Máy *</>
                  : <><Link2 size={12} strokeWidth={2} className="text-[#0066ff]" /> Link {PLATFORM_LABELS[service.platform] ?? "trang"} *</>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  {isICloud
                    ? <Smartphone size={15} strokeWidth={1.75} />
                    : <Link2 size={15} strokeWidth={1.75} />}
                </span>
                <input
                  type="text"
                  value={form.imeiOrLink}
                  onChange={(e) => {
                    setField("imeiOrLink", e.target.value);
                    if (linkTouched) setLinkError(validateLink(e.target.value));
                  }}
                  onBlur={() => { setLinkTouched(true); setLinkError(validateLink(form.imeiOrLink)); }}
                  placeholder={isICloud ? "VD: 352456789013456" : `Link ${PLATFORM_LABELS[service.platform] ?? ""}`}
                  className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none transition-colors ${
                    linkError ? "border-[#ef4444] bg-[#fff5f5] focus:border-[#ef4444]" : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#7C3AED]"
                  }`}
                  suppressHydrationWarning
                />
              </div>
              {linkError && <p className="mt-1 text-xs text-[#ef4444]">{linkError}</p>}
            </div>

            {/* SĐT Zalo */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5 flex items-center gap-1.5">
                <Phone size={12} strokeWidth={2} className="text-[#10b981]" />
                Số Điện Thoại Zalo liên hệ <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative">
                <Phone size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="tel"
                  value={form.zaloPhone}
                  onChange={(e) => {
                    setField("zaloPhone", e.target.value);
                    if (phoneTouched) setPhoneError(validatePhone(e.target.value));
                  }}
                  onBlur={() => { setPhoneTouched(true); setPhoneError(validatePhone(form.zaloPhone)); }}
                  placeholder="VD: 0901234567"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none transition-colors ${
                    phoneError ? "border-[#ef4444] bg-[#fff5f5] focus:border-[#ef4444]" : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#7C3AED]"
                  }`}
                  suppressHydrationWarning
                />
              </div>
              {phoneError && <p className="mt-1 text-xs text-[#ef4444]">{phoneError}</p>}
            </div>

            {/* Tài khoản/pass — ẩn với iCloud */}
            {!isICloud && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5 flex items-center gap-1.5">
                    <KeyRound size={12} strokeWidth={2} className="text-[#f59e0b]" />
                    Tài khoản/pass cũ (nếu có)
                  </label>
                  <div className="relative">
                    <KeyRound size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={form.accountPass}
                      onChange={(e) => setField("accountPass", e.target.value)}
                      placeholder="Tài khoản/pass cũ"
                      className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#7C3AED] focus:outline-none transition-colors"
                      suppressHydrationWarning
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5 flex items-center gap-1.5">
                    <Mail size={12} strokeWidth={2} className="text-[#ef4444]" />
                    Gmail/pass cũ (nếu có)
                  </label>
                  <div className="relative">
                    <Mail size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={form.gmailPass}
                      onChange={(e) => {
                        setField("gmailPass", e.target.value);
                        if (gmailTouched) setGmailError(validateGmail(e.target.value));
                      }}
                      onBlur={() => { setGmailTouched(true); setGmailError(validateGmail(form.gmailPass)); }}
                      placeholder="Gmail/pass cũ"
                      className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none transition-colors ${
                        gmailError ? "border-[#ef4444] bg-[#fff5f5] focus:border-[#ef4444]" : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#7C3AED]"
                      }`}
                      suppressHydrationWarning
                    />
                  </div>
                  {gmailError && <p className="mt-1 text-xs text-[#ef4444]">{gmailError}</p>}
                </div>
              </>
            )}
          </div>

          {/* Account type — chỉ hiện khi service bật flag và không phải iCloud */}
          {!isICloud && service.requiresAccountType && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-2">
                <Shield size={12} strokeWidth={2} className="text-[#0d9488]" />
                Loại tài khoản *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "chinh_chu",       Icon: Shield,        color: "#0d9488", bg: "#f0fdfa", border: "#0d9488", label: "Tài khoản chính chủ",  sub: "Tài khoản do bạn sở hữu"     },
                  { value: "khong_chinh_chu", Icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb", border: "#f59e0b", label: "Không chính chủ",       sub: "Tài khoản của người khác"    },
                ].map(({ value, Icon, color, bg, border, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("accountType", value)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                      form.accountType === value
                        ? "shadow-sm"
                        : "border-[#e2e8f0] bg-white"
                    }`}
                    style={form.accountType === value ? { borderColor: border, background: bg } : {}}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: form.accountType === value ? `${color}20` : "#f1f5f9" }}>
                      <Icon size={20} strokeWidth={1.75} style={{ color: form.accountType === value ? color : "#94a3b8" }} />
                    </div>
                    <span className="text-xs font-bold text-[#0f172a]">{label}</span>
                    <span className="text-[10px] text-[#64748b] leading-tight">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CCCD — chỉ hiện khi service bật flag và không phải iCloud */}
          {!isICloud && service.requiresCccd && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-2">
                <BadgeCheck size={12} strokeWidth={2} className="text-[#7c3aed]" />
                CCCD mặt trước <span className="text-[#ef4444]">*</span>
              </label>
              <div className={`relative rounded-xl border-2 border-dashed transition-colors ${
                cccdUrl ? "border-[#0d9488] bg-[#f0fdfa]"
                : cccdFieldError ? "border-[#ef4444] bg-[#fff5f5]"
                : "border-[#e2e8f0] bg-[#f8fafc] hover:border-[#0d9488]/50"
              }`}>
                {cccdUrl ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cccdUrl} alt="CCCD" className="w-16 h-10 object-cover rounded-lg border border-[#0d9488]/30" />
                    <div className="flex-1">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0d9488]">
                        <CheckCircle size={13} strokeWidth={2} /> Ảnh CCCD đã tải lên
                      </p>
                    </div>
                    <button type="button" onClick={() => setCccdUrl("")} className="flex items-center gap-1 text-[11px] text-[#ef4444] hover:underline">
                      <X size={12} strokeWidth={2} /> Xóa
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 py-7 cursor-pointer">
                    {cccdUploading ? (
                      <span className="flex items-center gap-2 text-xs text-[#0d9488]">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Đang tải lên...
                      </span>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] flex items-center justify-center">
                          <Upload size={22} strokeWidth={1.75} className="text-[#7c3aed]" />
                        </div>
                        <span className="text-xs font-semibold text-[#475569]">Click để tải lên CCCD</span>
                        <span className="text-[10px] text-[#94a3b8]">PNG, JPG hoặc JPEG</span>
                      </>
                    )}
                    <input ref={cccdInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handleCccdFile} disabled={cccdUploading} className="hidden" />
                  </label>
                )}
              </div>
              {cccdError && <p className="text-xs text-[#ef4444] mt-1">{cccdError}</p>}
              {cccdFieldError && !cccdUrl && <p className="text-xs text-[#ef4444] mt-1">{cccdFieldError}</p>}
            </div>
          )}

          {/* Warranty */}
          {service.warrantyOptions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Chế Độ Bảo Hành <span className="text-[#ef4444]">*</span>
              </label>
              <select
                value={form.warranty}
                onChange={(e) => {
                  setField("warranty", e.target.value);
                  setWarrantyTouched(true);
                  setWarrantyError(validateWarranty(e.target.value));
                }}
                onBlur={() => { setWarrantyTouched(true); setWarrantyError(validateWarranty(form.warranty)); }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[#0f172a] focus:outline-none transition-colors ${
                  warrantyError ? "border-[#ef4444] bg-[#fff5f5] focus:border-[#ef4444]" : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#7C3AED]"
                }`}
              >
                <option value="">— Chọn gói bảo hành —</option>
                {service.warrantyOptions.map((w) => (
                  <option key={w.name} value={w.name}>
                    {w.name}{w.price === 0 ? " — Miễn phí" : ` (+${formatVnd(w.price)})`}
                  </option>
                ))}
              </select>
              {warrantyError && <p className="mt-1 text-xs text-[#ef4444]">{warrantyError}</p>}
            </div>
          )}

          {/* Price summary */}
          {(() => {
            const discountedTotal = discountPct > 0 ? Math.round(total * (1 - discountPct / 100)) : total;
            return (
              <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#fef3c7] flex items-center justify-center shrink-0">
                    <Tag size={18} strokeWidth={1.75} className="text-[#b45309]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#92400e] font-semibold uppercase tracking-wide">Giá Dịch Vụ</p>
                    {discountPct > 0 ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#92400e]/50 line-through">{formatVnd(total)}</p>
                        <p className="text-xl font-extrabold text-[#e11d48]">{formatVnd(discountedTotal)}</p>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">-{discountPct}%</span>
                      </div>
                    ) : (
                      <p className="text-xl font-extrabold text-[#e11d48]">{formatVnd(total)}</p>
                    )}
                  </div>
                </div>
                {(hasDeviceVariants || warrantyPrice > 0) && (
                  <div className="text-[10px] text-[#92400e] text-right space-y-0.5">
                    {selectedVariant && <p className="font-semibold">{selectedVariant.name}</p>}
                    {warrantyPrice > 0 && <p>+ BH {formatVnd(warrantyPrice)}</p>}
                    {hasDeviceVariants && !deviceVariant && (
                      <p className="text-[#f59e0b] font-semibold">Giá có thể thay đổi theo thiết bị.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Note */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-1.5">
              <MessageSquare size={12} strokeWidth={2} className="text-[#64748b]" />
              Ghi chú
            </label>
            <div className="relative">
              <MessageSquare size={15} strokeWidth={1.75} className="absolute left-3 top-3 text-[#94a3b8]" />
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                placeholder="Ghi chú thêm về yêu cầu của bạn..."
                className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#7C3AED] focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#fef2f2] border border-[#fecaca]">
              <X size={14} strokeWidth={2} className="text-[#ef4444] shrink-0" />
              <p className="text-sm text-[#ef4444] font-medium">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ef4444] text-white text-sm font-bold hover:bg-[#be123c] disabled:opacity-60 transition-colors shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Send size={15} strokeWidth={2} />
                  {isLoggedIn ? "Xác Nhận Đặt Hàng" : "Đăng nhập để tiếp tục"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-[#64748b] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
            >
              <X size={14} strokeWidth={2} />
              Hủy
            </button>
          </div>

          {/* Đánh giá khách hàng — hiển thị dưới form */}
          {testimonials.length > 0 && (
            <div className="pt-4 border-t border-border">
              <TestimonialsSection items={testimonials} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function ServiceListWithForm({
  services,
  isLoggedIn,
  testimonials,
  discountPct = 0,
}: {
  services: ServiceItem[];
  isLoggedIn: boolean;
  testimonials: (TestimonialItem & { serviceId: string | null })[];
  discountPct?: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll]  = useState(false);
  const selectedService = services.find((s) => s.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId((prev) => {
      if (prev === id) { setAutoScroll(false); return null; }   // deselect
      setAutoScroll(prev === null);                              // scroll only on first open
      return id;
    });
  }

  function handleSuccess(_orderId: string) {
    router.push("/cam-on?type=dich-vu");
  }

  // Lọc testimonials cho service đang chọn: đúng serviceId HOẶC không gắn service cụ thể
  const panelTestimonials = selectedService
    ? testimonials.filter(
        (t) => t.serviceId === null || t.serviceId === selectedService.id,
      )
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {services.map((s) => (
        <ServiceCard
          key={s.id}
          service={s}
          isSelected={selectedId === s.id}
          onSelect={() => handleSelect(s.id)}
          discountPct={discountPct}
        />
      ))}

      {selectedService && (
        <ServiceOrderPanel
          service={selectedService}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelectedId(null)}
          onSuccess={handleSuccess}
          testimonials={panelTestimonials}
          autoScroll={autoScroll}
          discountPct={discountPct}
        />
      )}
    </div>
  );
}
