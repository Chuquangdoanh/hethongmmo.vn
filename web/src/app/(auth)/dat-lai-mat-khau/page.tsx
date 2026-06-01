import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

export default function DatLaiMatKhauPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl bg-white p-8" style={{border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
        <h1 className="text-xl font-bold text-text-dark mb-1">Đặt lại mật khẩu</h1>
        <p className="text-xs text-text-muted mb-6">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
