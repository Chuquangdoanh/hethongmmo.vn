"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import CaptchaWidget from "@/components/shared/CaptchaWidget";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", fullName: "", phone: "", password: "", confirmPassword: "",
  });
  const [captchaToken, setCaptchaToken]     = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [agreed, setAgreed]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError("Bạn cần đồng ý với Điều khoản dịch vụ."); return; }
    if (!captchaToken) { setError("Vui lòng xác minh captcha."); return; }
    if (form.password.length < 12)          { setError("Mật khẩu phải có ít nhất 12 ký tự."); return; }
    if (!/[A-Z]/.test(form.password))       { setError("Mật khẩu cần ít nhất 1 chữ hoa (A-Z)."); return; }
    if (!/[a-z]/.test(form.password))       { setError("Mật khẩu cần ít nhất 1 chữ thường (a-z)."); return; }
    if (!/[0-9]/.test(form.password))       { setError("Mật khẩu cần ít nhất 1 chữ số (0-9)."); return; }
    if (!/[^A-Za-z0-9]/.test(form.password)){ setError("Mật khẩu cần ít nhất 1 ký tự đặc biệt (!@#$%...)."); return; }
    if (form.password !== form.confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    if (!/^(0|\+84)[3-9]\d{8}$/.test(form.phone.trim())) {
      setError("Số điện thoại không hợp lệ. VD: 0912345678");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          captchaToken,
        }),
      });
      let json: { success: boolean; error?: string; details?: { fieldErrors: Record<string, string[]> } };
      try { json = await res.json() as typeof json; }
      catch { setError("Lỗi kết nối server. Vui lòng thử lại sau."); return; }
      if (!res.ok || !json.success) {
        const fieldErrors = json.details?.fieldErrors;
        const firstFieldError = fieldErrors && Object.values(fieldErrors)[0]?.[0];
        setError(firstFieldError ?? json.error ?? "Đăng ký thất bại, thử lại sau.");
        return;
      }
      sessionStorage.setItem("__reg_pwd", form.password);
      router.push(`/verify-otp?purpose=REGISTER&email=${encodeURIComponent(form.email)}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputWrap: React.CSSProperties = { position: "relative" };
  const iconStyle: React.CSSProperties = {
    position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
    color: "#94a3b8", pointerEvents: "none", display: "flex",
  };
  const inputCls =
    "w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 text-sm text-[#0f172a] " +
    "placeholder:text-[#94a3b8] focus:border-[#0066ff] focus:outline-none focus:ring-2 " +
    "focus:ring-[#0066ff]/10 transition-all";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Họ và tên */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Họ và tên
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><User size={15} /></span>
          <input
            type="text" autoComplete="name"
            value={form.fullName} onChange={set("fullName")} required
            className={inputCls} style={{ paddingLeft: 38 }}
            placeholder="Nhập họ và tên của bạn"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Số điện thoại */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Số điện thoại
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Phone size={15} /></span>
          <input
            type="tel" autoComplete="tel"
            value={form.phone} onChange={set("phone")} required
            className={inputCls} style={{ paddingLeft: 38 }}
            placeholder="Nhập số điện thoại"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Email
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Mail size={15} /></span>
          <input
            type="email" autoComplete="email"
            value={form.email} onChange={set("email")} required
            className={inputCls} style={{ paddingLeft: 38 }}
            placeholder="Nhập email của bạn"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Mật khẩu */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Mật khẩu
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Lock size={15} /></span>
          <input
            type={showPassword ? "text" : "password"} autoComplete="new-password"
            value={form.password} onChange={set("password")} required minLength={8}
            className={inputCls} style={{ paddingLeft: 38, paddingRight: 40 }}
            placeholder="Tối thiểu 12 ký tự"
            suppressHydrationWarning
          />
          <button
            type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
              color: "#94a3b8", background: "none", border: "none", cursor: "pointer",
              display: "flex", padding: 0,
            }}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 5, lineHeight: 1.5 }}>
          Yêu cầu: ≥ 12 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
        </p>
      </div>

      {/* Xác nhận mật khẩu */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Xác nhận mật khẩu
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Lock size={15} /></span>
          <input
            type={showConfirm ? "text" : "password"} autoComplete="new-password"
            value={form.confirmPassword} onChange={set("confirmPassword")} required
            className={inputCls} style={{ paddingLeft: 38, paddingRight: 40 }}
            placeholder="Nhập lại mật khẩu"
            suppressHydrationWarning
          />
          <button
            type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
            style={{
              position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
              color: "#94a3b8", background: "none", border: "none", cursor: "pointer",
              display: "flex", padding: 0,
            }}
          >
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <CaptchaWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

      {/* Checkbox điều khoản */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 2, accentColor: "#0066ff", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }}
          suppressHydrationWarning
        />
        <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
          Tôi đồng ý với{" "}
          <Link href="/dieu-khoan" style={{ color: "#0066ff", textDecoration: "none", fontWeight: 500 }}>
            Điều khoản dịch vụ
          </Link>{" "}
          và{" "}
          <Link href="/chinh-sach" style={{ color: "#0066ff", textDecoration: "none", fontWeight: 500 }}>
            Chính sách bảo mật
          </Link>
        </span>
      </label>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !captchaToken || !agreed}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: loading || !captchaToken || !agreed
            ? "#93c5fd"
            : "linear-gradient(135deg,#0066ff 0%,#0047cc 100%)",
          color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !captchaToken || !agreed ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .2s",
          boxShadow: loading || !captchaToken || !agreed ? "none" : "0 4px 16px rgba(0,102,255,.3)",
        }}
      >
        {loading ? "Đang xử lý..." : (
          <><span>Tạo tài khoản</span><ArrowRight size={16} /></>
        )}
      </button>

    </form>
  );
}
