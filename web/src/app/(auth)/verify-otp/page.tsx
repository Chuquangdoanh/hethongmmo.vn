import type { Metadata } from "next";
import { Suspense } from "react";
import OtpForm from "./OtpForm";

export const metadata: Metadata = { title: "Xác minh OTP" };

export default function VerifyOtpPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl bg-white p-8" style={{border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📧</div>
          <h1 className="text-xl font-bold text-text-dark mb-1">Nhập mã OTP</h1>
          <p className="text-xs text-text-muted">Mã xác minh đã được gửi vào email của bạn</p>
        </div>
        <Suspense fallback={null}>
          <OtpForm />
        </Suspense>
      </div>
    </div>
  );
}
