"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const OTP_LENGTH = 6;

export default function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purpose = searchParams.get("purpose") ?? "REGISTER";
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleChange(index: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = [...digits];
    for (let i = 0; i < text.length; i++) next[i] = text[i] ?? "";
    setDigits(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otpCode = digits.join("");
    if (otpCode.length < OTP_LENGTH) {
      setError("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    // For REGISTER: retrieve password stored during registration step
    let password = "";
    if (purpose === "REGISTER") {
      password = sessionStorage.getItem("__reg_pwd") ?? "";
      if (!password) {
        setError("Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.");
        router.push("/dang-ky");
        return;
      }
    }

    setError("");
    setLoading(true);
    try {
      const body =
        purpose === "REGISTER"
          ? { email, otpCode, purpose, password, confirmPassword: password }
          : { email, otpCode, purpose, password: "", confirmPassword: "" };

      const res = await fetch("/api/auth/verify-otp", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success: boolean; error?: string; postRegisterToken?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Mã OTP không đúng hoặc đã hết hạn.");
        return;
      }

      if (purpose === "REGISTER") {
        sessionStorage.removeItem("__reg_pwd");

        // Auto-login bằng đúng password vừa tạo tài khoản — tránh bắt user gõ lại
        // (nguồn gốc phổ biến của lỗi "sai mật khẩu" ngay sau khi đăng ký thành công,
        // đặc biệt trên bàn phím ảo mobile). postRegisterToken cho phép bỏ qua bước
        // captcha lần này vì captcha đã được xác minh ở bước /api/auth/register rồi.
        const result = await signIn("credentials", {
          email,
          password,
          postRegisterToken: json.postRegisterToken ?? "",
          redirect: false,
        });
        if (!result?.error) {
          router.push("/");
          router.refresh();
          return;
        }

        router.push("/dang-nhap");
      } else if (purpose === "RESET_PASSWORD") {
        router.push(`/dat-lai-mat-khau?email=${encodeURIComponent(email)}&code=${encodeURIComponent(otpCode)}`);
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Không thể gửi lại OTP.");
        return;
      }
      setCountdown(60);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {email && (
        <p className="text-center text-xs text-[#64748b]">
          Đã gửi đến <span className="font-medium text-[#0f172a]">{email}</span>
        </p>
      )}

      {/* OTP digit inputs */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 rounded-lg border border-[#e2e8f0] bg-white text-center text-lg font-bold text-[#0f172a] focus:border-[#0066ff] focus:outline-none transition-colors"
            suppressHydrationWarning
          />
        ))}
      </div>

      {error && <p className="text-center text-xs text-[#EF4444]">{error}</p>}

      <button
        type="submit"
        disabled={loading || digits.join("").length < OTP_LENGTH}
        className="w-full py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-semibold hover:bg-[#0047cc] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Đang xác minh..." : "Xác nhận"}
      </button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-xs text-[#64748b]">Gửi lại sau {countdown}s</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-[#0066ff] hover:text-[#0047cc] transition-colors disabled:opacity-60"
          >
            {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
          </button>
        )}
      </div>
    </form>
  );
}
