"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShow]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
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

      {/* Email */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
          Email
        </label>
        <div style={inputWrap}>
          <span style={iconStyle}><Mail size={15} /></span>
          <input
            type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            className={inputCls} style={{ paddingLeft: 38 }}
            placeholder="Nhập email của bạn"
          />
        </div>
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
            value={password} onChange={(e) => setPassword(e.target.value)} required
            className={inputCls} style={{ paddingLeft: 38, paddingRight: 40 }}
            placeholder="Nhập mật khẩu của bạn"
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
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: loading ? "#93c5fd" : "linear-gradient(135deg,#0066ff 0%,#0047cc 100%)",
          color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .2s",
          boxShadow: loading ? "none" : "0 4px 16px rgba(0,102,255,.3)",
        }}
      >
        {loading ? "Đang đăng nhập..." : (
          <><span>Đăng nhập</span><ArrowRight size={16} /></>
        )}
      </button>

    </form>
  );
}
