"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CouponRowActions({ couponId, isActive }: { couponId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/admin/coupons/${couponId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Tắt vĩnh viễn mã giảm giá này? Mã sẽ không thể dùng lại được nữa.")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/coupons/${couponId}`, { method: "DELETE", credentials: "include" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/admin/coupons/${couponId}/sua`} className="text-xs font-semibold text-[#1d4ed8] hover:underline">
        Sửa
      </Link>
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggleActive()}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
      >
        {isActive ? "Tắt" : "Bật"}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleDeactivate()}
        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        Xóa
      </button>
    </div>
  );
}
