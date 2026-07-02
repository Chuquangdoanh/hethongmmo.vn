"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RuleActions({ ruleId, isActive }: { ruleId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggleActive() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEditPercent() {
    const input = window.prompt("Nhập % hoa hồng mới (0–100):");
    if (input === null) return;
    const percent = Number(input);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      window.alert("% hoa hồng không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPercent: percent }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleEditPercent}
        className="rounded-md bg-gray-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        Sửa %
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={handleToggleActive}
        className={`rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${isActive ? "bg-red-600" : "bg-green-600"}`}
      >
        {isActive ? "Tắt" : "Bật"}
      </button>
    </div>
  );
}
