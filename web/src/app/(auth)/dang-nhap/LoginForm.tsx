"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import CaptchaWidget, { type CaptchaWidgetRef } from "@/components/shared/CaptchaWidget";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShow]     = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaWidgetRef>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [emailError, setEmailError]         = useState("");
  const [emailTouched, setEmailTouched]     = useState(false);
  const [passwordError, setPasswordError]   = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  function validateEmail(value: string): string {
    const v = value.trim();
    if (!v) return "";
    const looksLikePhone = v.startsWith("0") || v.startsWith("+84");
    if (looksLikePhone) {
      const isValidPhone = /^0[35789]\d{8}$/.test(v) || /^\+84[35789]\d{8}$/.test(v);
      return isValidPhone ? "" : "Số điện thoại không đúng định dạng. VD: 0901234567";
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return isValidEmail ? "" : "Email không đúng định dạng. VD: ten@gmail.com";
  }

  function validatePassword(value: string): string {
    if (!value) return "Vui lòng nhập mật khẩu";
    return "";
  }

  const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const err = validateEmail(email);
    if (err) { setEmailError(err); setEmailTouched(true); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setPasswordError(pwErr); setPasswordTouched(true); return; }
    if (captchaEnabled && !captchaToken) { setError("Vui lòng xác minh captcha."); return; }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        captchaToken,
        redirect: false,
      });
      if (result?.error) {
        const code = result.code;
        if (code === "ACCOUNT_BANNED" || code === "ACCOUNT_LOCKED") {
          router.push("/tai-khoan-bi-khoa");
          return;
        }
        if (code === "REQUIRE_OTP") {
          router.push(`/verify-otp?purpose=LOGIN_2FA&email=${encodeURIComponent(email)}`);
          return;
        }
        if (code === "CAPTCHA_FAILED") {
          setCaptchaToken("");
          captchaRef.current?.reset();
          setError("Xác minh captcha thất bại. Vui lòng xác minh lại.");
          return;
        }
        if (code === "PASSWORD_RESET_REQUIRED") {
          router.push("/quen-mat-khau?reason=reset_required");
          return;
        }
        // Reset captcha sau mỗi lần đăng nhập thất bại để user có thể thử lại
        setCaptchaToken("");
        captchaRef.current?.reset();
        setError("Email hoặc mật khẩu không đúng.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Email / SĐT */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Email / Số điện thoại
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Mail size={15} /></span>
          <input
            type="text" autoComplete="email" inputMode="email"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailTouched) setEmailError(validateEmail(e.target.value));
            }}
            onBlur={() => {
              setEmailTouched(true);
              setEmailError(validateEmail(email));
            }}
            required
            className={inputCls}
            style={{ paddingLeft: 38, borderColor: emailError ? "#ef4444" : undefined }}
            placeholder="Email hoặc số điện thoại"
            suppressHydrationWarning
          />
        </div>
        {emailError && (
          <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
            {emailError}
          </p>
        )}
      </div>

      {/* Mật khẩu */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Mật khẩu</label>
          <Link href="/quen-mat-khau"
            style={{ fontSize: 12, color: "#0066ff", textDecoration: "none", fontWeight: 500 }}
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div style={inputWrap}>
          <span style={iconStyle}><Lock size={15} /></span>
          <input
            type={showPassword ? "text" : "password"} autoComplete="current-password"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordTouched && !e.target.value) setPasswordError("Vui lòng nhập mật khẩu");
              else if (passwordTouched) setPasswordError("");
            }}
            onBlur={() => {
              setPasswordTouched(true);
              setPasswordError(validatePassword(password));
            }}
            required
            className={inputCls}
            style={{ paddingLeft: 38, paddingRight: 40, borderColor: passwordError ? "#ef4444" : undefined }}
            placeholder="Nhập mật khẩu của bạn"
            suppressHydrationWarning
          />
          <button
            type="button" tabIndex={-1} onClick={() => setShow((v) => !v)}
            style={{
              position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
              color: "#94a3b8", background: "none", border: "none", cursor: "pointer",
              display: "flex", padding: 0,
            }}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {passwordError && (
          <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
            {passwordError}
          </p>
        )}
      </div>

      <CaptchaWidget
        ref={captchaRef}
        onVerify={setCaptchaToken}
        onExpire={() => setCaptchaToken("")}
        onError={() => {
          setCaptchaToken("");
          setError("Không tải được xác minh bảo mật. Vui lòng kiểm tra kết nối mạng và tải lại trang.");
        }}
      />

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || (captchaEnabled && !captchaToken)}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: loading || (captchaEnabled && !captchaToken) ? "#93c5fd" : "linear-gradient(135deg,#0066ff 0%,#0047cc 100%)",
          color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading || (captchaEnabled && !captchaToken) ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .2s",
          boxShadow: loading || !captchaToken ? "none" : "0 4px 16px rgba(0,102,255,.3)",
        }}
      >
        {loading ? "Đang đăng nhập..." : (
          <><span>Đăng nhập</span><ArrowRight size={16} /></>
        )}
      </button>

    </form>
  );
}
