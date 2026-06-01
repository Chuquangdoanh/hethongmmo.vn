"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";
import { randomUUID } from "@/lib/utils/uuid";
import {
  Users, Clock, TrendingUp, Eye, CheckCircle, Zap,
  Star, ShoppingCart, Upload, X,
  Phone, Link2, Smartphone, Mail, KeyRound,
  Shield, AlertTriangle, Tag, MessageSquare, Send,
  ChevronRight, BadgeCheck,
} from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", TIKTOK: "TikTok", INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube", GOOGLE: "Google", ZALO: "Zalo",
  TELEGRAM: "Telegram", TWITTER: "Twitter (X)", ICLOUD: "iCloud", OTHER: "Khác",
};
const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK: "🔵", TIKTOK: "🎵", INSTAGRAM: "📸", YOUTUBE: "▶️",
  GOOGLE: "🔍", ZALO: "💬", TELEGRAM: "✈️", TWITTER: "🐦",
  ICLOUD: "☁️", OTHER: "🌐",
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= full ? "text-[#F59E0B]" : "text-[#d1d5db]"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

function ServiceCard({
  service,
  isSelected,
  onSelect,
}: {
  service: ServiceItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const price = Number(service.price);
  const minPrice = service.deviceVariants.length > 0
    ? Math.min(...service.deviceVariants.map(v => v.price))
    : price;
  const hasVariants = service.deviceVariants.length > 0;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group ${isSelected ? "border-[#0d9488] ring-2 ring-[#0d9488]/20" : "border-[#e2e8f0] hover:border-[#0066ff]"}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#f1f5f9] overflow-hidden">
        {service.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.thumbnail} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">{PLATFORM_ICONS[service.platform] ?? "⚡"}</div>
        )}
        {/* Rating badge */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f59e0b] text-white shadow-sm">
          <Star size={10} strokeWidth={0} fill="currentColor" />
          {service.rating.toFixed(1)}
        </span>
        {/* HOT badge */}
        {service.isFeatured && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#ef4444] text-white tracking-wide">HOT</span>
        )}
        {/* Views */}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/40 text-white backdrop-blur-sm">
          <Eye size={10} strokeWidth={2} />
          {service.totalViews > 999 ? `${(service.totalViews / 1000).toFixed(1)}k` : service.totalViews}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Platform + category tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#475569] uppercase tracking-wide">
            {PLATFORM_LABELS[service.platform] ?? service.platform}
          </span>
          {service.category && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
              {service.category}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug group-hover:text-[#0066ff] transition-colors">
          {service.name}
        </h3>

        {/* Device variants */}
        {hasVariants && (
          <div className="flex flex-wrap gap-1">
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

        {/* ── GC MMO stats grid ── */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-3 border-y border-[#f1f5f9]">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#dbeafe] flex items-center justify-center shrink-0">
              <Users size={11} strokeWidth={2} className="text-[#2563eb]" />
            </div>
            <span className="text-[11px] text-[#475569] font-medium">
              {service.customerCount.toLocaleString("vi-VN")} khách
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#fef3c7] flex items-center justify-center shrink-0">
              <Clock size={11} strokeWidth={2} className="text-[#b45309]" />
            </div>
            <span className="text-[11px] text-[#475569] font-medium">
              {service.processingTime ?? "Nhanh"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#f0fdf4] flex items-center justify-center shrink-0">
              <TrendingUp size={11} strokeWidth={2} className="text-[#16a34a]" />
            </div>
            <span className="text-[11px] text-[#475569] font-medium">
              {service.totalOrders.toLocaleString("vi-VN")} đơn
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#fef9c3] flex items-center justify-center shrink-0">
              <Star size={11} strokeWidth={0} fill="#ca8a04" className="text-[#ca8a04]" />
            </div>
            <span className="text-[11px] text-[#475569] font-medium">
              {service.rating.toFixed(1)}/5 sao
            </span>
          </div>
        </div>

        {/* ── Success rate bar ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} strokeWidth={2} className="text-[#10b981]" />
              <span className="text-[11px] text-[#64748b] font-medium">Tỷ lệ thành công</span>
            </div>
            <span className="text-[11px] font-extrabold text-[#10b981]">{service.successRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${service.successRate}%`,
                background: `linear-gradient(90deg, #10b981, #22c55e)`,
              }}
            />
          </div>
        </div>

        {/* Warranty pills */}
        {service.warrantyOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {service.warrantyOptions.map((w, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  w.price === 0
                    ? "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]"
                    : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                }`}
              >
                <Zap size={9} strokeWidth={2} />
                {w.name}{w.price === 0 ? " — Miễn phí" : ` +${formatVnd(w.price)}`}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-[#94a3b8] mb-0.5">{hasVariants ? "Từ" : "Giá dịch vụ"}</p>
            <p className="text-xl font-extrabold text-[#e11d48]">{formatVnd(minPrice)}</p>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isSelected
                ? "bg-[#0d9488] text-white shadow-md"
                : "bg-[#0f172a] text-white hover:bg-[#0066ff] hover:shadow-md"
            }`}
          >
            <ShoppingCart size={14} strokeWidth={2} />
            {isSelected ? "Đang chọn" : "Đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceOrderPanel({
  service,
  isLoggedIn,
  onClose,
  onSuccess,
}: {
  service: ServiceItem;
  isLoggedIn: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
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

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectedVariant = service.deviceVariants.find(v => v.name === deviceVariant);
  const basePrice = selectedVariant ? selectedVariant.price : price;
  const warrantyPrice = service.warrantyOptions.find((w) => w.name === form.warranty)?.price ?? 0;
  const total = basePrice + warrantyPrice;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    if (!form.zaloPhone.trim()) { setError("Vui lòng nhập số điện thoại Zalo liên hệ."); return; }
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
    <div ref={panelRef} className="col-span-full mt-2 scroll-mt-6">
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
                  onChange={(e) => setField("imeiOrLink", e.target.value)}
                  placeholder={isICloud ? "VD: 352456789013456" : `Link ${PLATFORM_LABELS[service.platform] ?? ""}`}
                  className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* SĐT Zalo */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5 flex items-center gap-1.5">
                <Phone size={12} strokeWidth={2} className="text-[#10b981]" />
                Số Điện Thoại Zalo liên hệ *
              </label>
              <div className="relative">
                <Phone size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  required
                  type="tel"
                  value={form.zaloPhone}
                  onChange={(e) => setField("zaloPhone", e.target.value)}
                  placeholder="VD: 0901234567"
                  className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
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
                      onChange={(e) => setField("gmailPass", e.target.value)}
                      placeholder="Gmail/pass cũ"
                      className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#7C3AED] focus:outline-none transition-colors"
                    />
                  </div>
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
                CCCD mặt trước
              </label>
              <div className={`relative rounded-xl border-2 border-dashed transition-colors ${cccdUrl ? "border-[#0d9488] bg-[#f0fdfa]" : "border-[#e2e8f0] bg-[#f8fafc] hover:border-[#0d9488]/50"}`}>
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
              {cccdError && <p className="flex items-center gap-1 text-xs text-[#ef4444] mt-1"><X size={11} strokeWidth={2} />{cccdError}</p>}
            </div>
          )}

          {/* Warranty */}
          {service.warrantyOptions.length > 0 && (
            <div>
              <label className="block text-xs text-[#64748b] mb-1.5">Chế độ bảo hành</label>
              <select
                value={form.warranty}
                onChange={(e) => setField("warranty", e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#0f172a] focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="">Chọn chế độ bảo hành</option>
                {service.warrantyOptions.map((w) => (
                  <option key={w.name} value={w.name}>
                    {w.name}{w.price === 0 ? " — Miễn phí" : ` (+${formatVnd(w.price)})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price summary */}
          <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fef3c7] flex items-center justify-center shrink-0">
                <Tag size={18} strokeWidth={1.75} className="text-[#b45309]" />
              </div>
              <div>
                <p className="text-[10px] text-[#92400e] font-semibold uppercase tracking-wide">Giá Dịch Vụ</p>
                <p className="text-xl font-extrabold text-[#e11d48]">{formatVnd(total)}</p>
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0d9488] text-white text-sm font-bold hover:bg-[#0f766e] disabled:opacity-60 transition-colors shadow-md"
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
        </form>
      </div>
    </div>
  );
}

export default function ServiceListWithForm({
  services,
  isLoggedIn,
}: {
  services: ServiceItem[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedService = services.find((s) => s.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleSuccess(_orderId: string) {
    router.push("/don-hang");
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {services.map((s) => (
        <ServiceCard
          key={s.id}
          service={s}
          isSelected={selectedId === s.id}
          onSelect={() => handleSelect(s.id)}
        />
      ))}

      {selectedService && (
        <ServiceOrderPanel
          service={selectedService}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelectedId(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
