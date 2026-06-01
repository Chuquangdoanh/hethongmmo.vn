import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập — hethongmmo.vn" };

export default async function DangNhapPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800, color: "#111827",
          marginBottom: 6, letterSpacing: "-0.01em",
        }}>
          Chào mừng trở lại
        </h2>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          Đăng nhập để tiếp tục sử dụng hệ thống
        </p>
      </div>
      <Suspense fallback={<div style={{ height: 200, background: "#f9fafb", borderRadius: 12 }} />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
