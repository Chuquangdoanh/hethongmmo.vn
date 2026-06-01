import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function QuenMatKhauPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8" style={{boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#0f172a] mb-1">Quên mật khẩu</h1>
          <p className="text-xs text-[#64748b]">Nhập email để nhận link đặt lại mật khẩu.</p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-xs text-[#64748b]">
          Nhớ mật khẩu rồi?{" "}
          <Link href="/dang-nhap" className="text-[#0066ff] hover:text-[#0047cc] transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
