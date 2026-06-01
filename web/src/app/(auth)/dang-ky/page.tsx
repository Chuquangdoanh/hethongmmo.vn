import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = { title: "Đăng ký — hethongmmo.vn" };

export default async function DangKyPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800, color: "#111827",
          marginBottom: 6, letterSpacing: "-0.01em",
        }}>
          Tạo tài khoản mới
        </h2>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          Điền thông tin để bắt đầu sử dụng hệ thống
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
