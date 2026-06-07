"use client";

import { useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  id: string;
  type: "ads" | "fanpage";
  initialStatus: string;
}

export function StatusToggle({ id, type, initialStatus }: Props) {
  const [status, setStatus]   = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const isDone = status === "DONE";

  async function toggle() {
    const next = isDone ? "PENDING" : "DONE";
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dang-ky-dich-vu/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) setStatus(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 110 }}>
      {isDone ? (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
          color: "#15803d", background: "#dcfce7",
        }}>
          <CheckCircle2 size={11} strokeWidth={2.5} />
          Đã xử lý
        </span>
      ) : (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
          color: "#b45309", background: "#fef3c7",
        }}>
          <Clock size={11} strokeWidth={2.5} />
          Chưa xử lý
        </span>
      )}
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          border: "1px solid",
          borderColor: isDone ? "#d1d5db" : "#16a34a",
          background:  isDone ? "#f9fafb" : "#f0fdf4",
          color:       isDone ? "#6b7280" : "#15803d",
          opacity: loading ? 0.55 : 1,
          transition: "all .15s",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? "…" : isDone ? "Đặt lại" : "✓ Đánh dấu xử lý"}
      </button>
    </div>
  );
}
