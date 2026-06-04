"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatVnd } from "@/lib/utils/format";

interface WarrantyOption { name: string; price: number; }
interface DeviceVariant { name: string; price: number; }

const PLATFORM_LABELS: Record<string, string> = {
  ICLOUD: "iCloud", FACEBOOK: "Facebook", TIKTOK: "TikTok",
  INSTAGRAM: "Instagram", YOUTUBE: "YouTube", GOOGLE: "Google",
  ZALO: "Zalo", TELEGRAM: "Telegram", TWITTER: "Twitter (X)", OTHER: "Khác",
};

interface FieldErrors {
  deviceVariant?: string;
  link?: string;
  phone?: string;
  cccd?: string;
  warranty?: string;
}

interface Props {
  serviceId: string;
  serviceName: string;
  platform: string;
  price: number;
  warrantyOptions: WarrantyOption[];
  deviceVariants: DeviceVariant[];
  isLoggedIn: boolean;
  requiresAccountType?: boolean;
  requiresCccd?: boolean;
}

export default function ServiceOrderForm({
  serviceId, serviceName, platform, price, warrantyOptions, deviceVariants, isLoggedIn,
  requiresAccountType = false, requiresCccd = false,
}: Props) {
  const router = useRouter();
  const cccdInputRef = useRef<HTMLInputElement>(null);
  const isICloud = platform === "ICLOUD";
  const hasDeviceVariants = deviceVariants.length > 0;
  const showAccountType = requiresAccountType;
  const showCccd = requiresCccd;

  const [deviceVariant, setDeviceVariant] = useState<string>(
    deviceVariants.length === 1 ? (deviceVariants[0]?.name ?? "") : ""
  );
  const [link, setLink] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"chinh_chu" | "khong_chinh_chu">("chinh_chu");
  const [cccdUrl, setCccdUrl] = useState("");
  const [cccdUploading, setCccdUploading] = useState(false);
  const [cccdError, setCccdError] = useState("");
  const [warranty, setWarranty] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [isBalanceError, setIsBalanceError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phoneTouched, setPhoneTouched]     = useState(false);
  const [warrantyTouched, setWarrantyTouched] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const selectedVariant = deviceVariants.find(v => v.name === deviceVariant);
  const basePrice = selectedVariant ? selectedVariant.price : price;
  const warrantyPrice = warrantyOptions.find((w) => w.name === warranty)?.price ?? 0;
  const total = basePrice + warrantyPrice;

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

  function validatePhone(value: string): string {
    if (!value.trim()) return "Vui lòng nhập số điện thoại liên hệ.";
    if (!/^(0|\+84)[3-9]\d{8}$/.test(value.trim())) return "Số điện thoại không hợp lệ (VD: 0901234567).";
    return "";
  }

  function validateWarranty(value: string): string {
    if (warrantyOptions.length > 0 && !value) return "Vui lòng chọn gói bảo hành.";
    return "";
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (hasDeviceVariants && !deviceVariant) {
      errs.deviceVariant = "Vui lòng chọn thiết bị.";
    }
    if (isICloud && link.trim() && !/^\d{14,16}$/.test(link.trim())) {
      errs.link = "IMEI không hợp lệ — cần 14–16 chữ số, không có ký tự khác.";
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) errs.phone = phoneErr;
    if (showCccd && !cccdUrl) errs.cccd = "Vui lòng tải lên ảnh CCCD mặt trước.";
    const warrantyErr = validateWarranty(warranty);
    if (warrantyErr) errs.warranty = warrantyErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) { router.push("/dang-nhap"); return; }
    if (!validate()) return;
    setError("");
    setErrorCode("");
    setIsBalanceError(false);
    setReportSent(false);
    setFieldErrors({});
    setLoading(true);
    try {
      const customerNote = JSON.stringify({
        ...(isICloud ? { imei: link.trim() || undefined } : { link: link.trim() || undefined }),
        phone: phone.trim() || undefined,
        accountType: showAccountType ? accountType : undefined,
        cccdUrl: showCccd ? (cccdUrl || undefined) : undefined,
      });
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "SERVICE",
          itemId: serviceId,
          warrantyVariant: warranty || undefined,
          deviceVariant: deviceVariant || undefined,
          customerNote,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json() as { data?: { orderId?: string }; error?: string; code?: string };
      if (!res.ok || !json.data?.orderId) {
        const code = json.code ?? "";
        setErrorCode(code);
        if (code === "INSUFFICIENT_BALANCE") {
          setIsBalanceError(true);
          setError(json.error ?? "Số dư không đủ để đặt hàng.");
        } else if (code === "DEVICE_REQUIRED" || code === "INVALID_DEVICE") {
          setFieldErrors({ deviceVariant: json.error ?? "Vui lòng chọn thiết bị hợp lệ." });
        } else {
          setError(json.error ?? "Đặt hàng thất bại, thử lại sau.");
        }
        return;
      }
      router.push("/don-hang");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReport() {
    if (reportSent || reportLoading) return;
    setReportLoading(true);
    try {
      await fetch("/api/user/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Lỗi đặt dịch vụ: ${serviceName}`,
          content: `Người dùng gặp lỗi khi đặt dịch vụ "${serviceName}".\n\nMã lỗi: ${errorCode || "UNKNOWN"}\nNội dung lỗi: ${error}\n\nThông tin thêm: Platform=${platform}${deviceVariant ? `, Thiết bị=${deviceVariant}` : ""}`,
        }),
      });
      setReportSent(true);
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Device variants */}
      {hasDeviceVariants && (
        <div>
          <label className="block text-xs text-[#64748b] mb-2 font-semibold">Thiết Bị Cần Mở *</label>
          <div className="grid grid-cols-1 gap-2">
            {deviceVariants.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => { setDeviceVariant(v.name); setFieldErrors(p => ({ ...p, deviceVariant: undefined })); }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                  deviceVariant === v.name
                    ? "border-[#0066ff] bg-[#eff6ff]"
                    : fieldErrors.deviceVariant
                    ? "border-[#EF4444] bg-[#fff5f5]"
                    : "border-[#e2e8f0] bg-[#f8fafc] hover:border-[#0066ff]/40"
                }`}
              >
                <span className="text-sm font-semibold text-[#0f172a]">{v.name}</span>
                <span className={`text-sm font-bold ${deviceVariant === v.name ? "text-[#0066ff]" : "text-[#EF4444]"}`}>
                  {formatVnd(v.price)}
                </span>
              </button>
            ))}
          </div>
          {fieldErrors.deviceVariant && (
            <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1">
              <span>⚠</span> {fieldErrors.deviceVariant}
            </p>
          )}
        </div>
      )}

      {/* IMEI / Link */}
      <div>
        <label className="block text-xs text-[#64748b] mb-1.5">
          {isICloud ? "IMEI Máy" : `Link ${PLATFORM_LABELS[platform] ?? "trang"}`}
        </label>
        <input
          type="text"
          value={link}
          onChange={(e) => { setLink(e.target.value); setFieldErrors(p => ({ ...p, link: undefined })); }}
          placeholder={isICloud ? "VD: 352456789013456" : "https://..."}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none transition-colors ${
            fieldErrors.link
              ? "border-[#EF4444] bg-[#fff5f5] focus:border-[#EF4444]"
              : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0066ff]"
          }`}
          suppressHydrationWarning
        />
        {fieldErrors.link && (
          <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1">
            <span>⚠</span> {fieldErrors.link}
          </p>
        )}
      </div>

      {/* Phone — bắt buộc mọi dịch vụ */}
      <div>
        <label className="block text-xs text-[#64748b] mb-1.5">
          Số Điện Thoại Liên Hệ <span className="text-[#EF4444]">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneTouched) setFieldErrors(p => ({ ...p, phone: validatePhone(e.target.value) || undefined }));
          }}
          onBlur={() => {
            setPhoneTouched(true);
            setFieldErrors(p => ({ ...p, phone: validatePhone(phone) || undefined }));
          }}
          placeholder="VD: 0901234567"
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none transition-colors ${
            fieldErrors.phone
              ? "border-[#EF4444] bg-[#fff5f5] focus:border-[#EF4444]"
              : "border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0066ff]"
          }`}
          suppressHydrationWarning
        />
        {fieldErrors.phone && (
          <p className="mt-1.5 text-xs text-[#EF4444]">{fieldErrors.phone}</p>
        )}
      </div>

      {/* Account type */}
      {showAccountType && (
        <div>
          <label className="block text-xs text-[#64748b] mb-2">Loại tài khoản *</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "chinh_chu", label: "Tài khoản chính chủ", sub: "Tài khoản do bạn sở hữu", icon: "🛡" },
              { value: "khong_chinh_chu", label: "Không chính chủ", sub: "Tài khoản của người khác", icon: "⚠️" },
            ].map(({ value, label, sub, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value as "chinh_chu" | "khong_chinh_chu")}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  accountType === value
                    ? "border-[#0066ff] bg-[#eff6ff]"
                    : "border-[#e2e8f0] bg-white hover:border-[#0066ff]/40"
                }`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-bold text-[#0f172a]">{label}</span>
                <span className="text-[10px] text-[#64748b]">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CCCD upload */}
      {showCccd && (
        <div>
          <label className="block text-xs text-[#64748b] mb-2">
            CCCD mặt trước <span className="text-[#EF4444]">*</span>
          </label>
          <div className={`relative rounded-xl border-2 border-dashed transition-colors ${
            cccdUrl ? "border-primary bg-[#eff6ff]"
            : fieldErrors.cccd ? "border-[#EF4444] bg-[#fff5f5]"
            : "border-border bg-light hover:border-primary/50"
          }`}>
            {cccdUrl ? (
              <div className="flex items-center gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cccdUrl} alt="CCCD" className="w-16 h-10 object-cover rounded-lg border border-[#0066ff]/30" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#0066ff]">✅ Ảnh CCCD đã tải lên</p>
                </div>
                <button type="button" onClick={() => setCccdUrl("")} className="text-[#ef4444] text-xs hover:underline">Xóa</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-5 cursor-pointer">
                {cccdUploading ? (
                  <span className="flex items-center gap-2 text-xs text-[#0066ff]">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Đang tải...
                  </span>
                ) : (
                  <>
                    <span className="text-2xl">📤</span>
                    <span className="text-xs font-semibold text-[#475569]">Click để tải lên CCCD</span>
                    <span className="text-[10px] text-[#94a3b8]">PNG, JPG hoặc JPEG</span>
                  </>
                )}
                <input
                  ref={cccdInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCccdFile}
                  disabled={cccdUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {cccdError && <p className="text-xs text-[#ef4444] mt-1">{cccdError}</p>}
          {fieldErrors.cccd && <p className="text-xs text-[#EF4444] mt-1">{fieldErrors.cccd}</p>}
        </div>
      )}

      {/* Warranty — bắt buộc chọn nếu dịch vụ có options */}
      {warrantyOptions.length > 0 && (
        <div>
          <label className="block text-xs text-[#64748b] mb-1.5">
            Chế Độ Bảo Hành <span className="text-[#EF4444]">*</span>
          </label>
          <select
            value={warranty}
            onChange={(e) => {
            setWarranty(e.target.value);
            setWarrantyTouched(true);
            setFieldErrors(p => ({ ...p, warranty: validateWarranty(e.target.value) || undefined }));
          }}
          onBlur={() => {
            setWarrantyTouched(true);
            setFieldErrors(p => ({ ...p, warranty: validateWarranty(warranty) || undefined }));
          }}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-dark focus:outline-none transition-colors ${
              fieldErrors.warranty
                ? "border-[#EF4444] bg-[#fff5f5] focus:border-[#EF4444]"
                : "border-border bg-light focus:border-primary"
            }`}
          >
            <option value="">— Chọn gói bảo hành —</option>
            {warrantyOptions.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name}{w.price === 0 ? " — Miễn phí" : ` (+${formatVnd(w.price)})`}
              </option>
            ))}
          </select>
          {fieldErrors.warranty && (
            <p className="mt-1.5 text-xs text-[#EF4444]">{fieldErrors.warranty}</p>
          )}
          {warrantyOptions.some(w => w.price > 0) && (
            <p className="text-[10px] text-[#E53E3E] mt-1">Đây là mức giá niêm yết có thể thay đổi theo từng máy.</p>
          )}
        </div>
      )}

      {/* Price summary */}
      <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
        <div className="flex justify-between text-xs text-[#64748b] mb-1">
          <span>Dịch vụ</span>
          <span className="truncate ml-4 text-right max-w-[150px]">{serviceName}</span>
        </div>
        {selectedVariant && (
          <div className="flex justify-between text-xs text-[#64748b] mb-1">
            <span>Thiết bị</span>
            <span>{selectedVariant.name}</span>
          </div>
        )}
        {warrantyPrice > 0 && (
          <div className="flex justify-between text-xs text-[#64748b] mb-2">
            <span>Bảo hành</span>
            <span>+{formatVnd(warrantyPrice)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold text-[#0f172a] pt-2 border-t border-[#e2e8f0]">
          <span>Tổng cộng</span>
          <span className="text-[#E53E3E]">{formatVnd(total)}</span>
        </div>
      </div>

      {/* General error */}
      {error && (
        isBalanceError ? (
          <div className="rounded-lg border border-[#EF4444]/30 bg-[#fff5f5] p-3 flex items-start gap-2.5">
            <span className="text-base mt-0.5">💳</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#EF4444]">{error}</p>
              <Link href="/nap-tien" className="mt-1 inline-block text-xs font-semibold text-[#0066ff] underline underline-offset-2 hover:text-[#0047cc]">
                Nạp tiền ngay →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-[#EF4444]/30 bg-[#fff5f5] p-3 space-y-2">
            <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1.5">
              <span>⚠</span> {error}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              {reportSent ? (
                <p className="text-xs text-[#10B981] font-medium">✅ Đã gửi báo cáo cho admin.</p>
              ) : (
                <button
                  type="button"
                  onClick={sendReport}
                  disabled={reportLoading}
                  className="text-xs text-[#64748b] underline underline-offset-2 hover:text-[#0f172a] disabled:opacity-50 transition-colors"
                >
                  {reportLoading ? "Đang gửi..." : "Báo cáo sự cố cho Admin"}
                </button>
              )}
            </div>
          </div>
        )
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-[#FF4500] text-white text-sm font-semibold hover:bg-[#D03A00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Đang xử lý..." : isLoggedIn ? "Đặt hàng ngay" : "Đăng nhập để mua"}
      </button>

      {!isLoggedIn && (
        <p className="text-[10px] text-[#64748b] text-center">Bạn cần đăng nhập để thực hiện đơn hàng</p>
      )}
    </form>
  );
}
