"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeAffiliateButton({ affiliateId }: { affiliateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    const confirmed = window.confirm(
      "Gỡ quyền Affiliate của tài khoản này? Mã Affiliate sẽ không còn hiệu lực và tài khoản sẽ không thể ăn hoa hồng nữa. Khách hàng đã liên kết vẫn giữ nguyên liên kết trừ khi bạn chuyển/gỡ riêng.",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAffiliate: false }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin/affiliates");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleRevoke}
      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Đang xử lý..." : "Gỡ quyền Affiliate"}
    </button>
  );
}
