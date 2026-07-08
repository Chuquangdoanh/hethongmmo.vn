import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import CouponForm from "../_components/CouponForm";

export const metadata: Metadata = { title: "Admin — Tạo mã giảm giá" };

export default async function CreateCouponPage() {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;
  if (!me || me.role !== "ADMIN") redirect("/admin/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Tạo mã giảm giá</h1>
      <CouponForm />
    </div>
  );
}
