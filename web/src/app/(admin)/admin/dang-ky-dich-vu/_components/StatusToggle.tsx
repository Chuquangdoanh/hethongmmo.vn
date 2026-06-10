"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Props {
  id: string;
  type: "ads" | "fanpage";
  initialStatus: string;
  initialNote?: string;
}

export function StatusToggle({ id, type, initialStatus, initialNote }: Props) {
  const [status, setStatus]           = useState(initialStatus);
  const [note, setNote]               = useState(initialNote ?? "");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteInput, setNoteInput]     = useState("");

  const isDone = status === "DONE";

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dang-ky-dich-vu/${type}/${id}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE", note: noteInput.trim() }),
      });
      if (res.ok) {
        setStatus("DONE");
        setNote(noteInput.trim());
        setShowNoteForm(false);
        setNoteInput("");
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Lỗi không xác định");
      }
    } catch {
      setError("Mất kết nối, thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dang-ky-dich-vu/${type}/${id}`, { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });
      if (res.ok) {
        setStatus("PENDING");
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Lỗi không xác định");
      }
    } catch {
      setError("Mất kết nối, thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, minWidth: 140 }}>

      {/* Status badge */}
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

      {/* Saved note (shown when DONE and note exists) */}
      {isDone && note && (
        <p style={{
          fontSize: 11, color: "#475569", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 6,
          padding: "3px 7px", margin: 0, maxWidth: 200,
          whiteSpace: "normal", lineHeight: 1.4,
        }}>
          {note}
        </p>
      )}

      {/* Note input form (shown when clicking "Đánh dấu xử lý") */}
      {showNoteForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 200 }}>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ghi chú (tùy chọn)..."
            rows={2}
            autoFocus
            style={{
              fontSize: 11, padding: "5px 8px", borderRadius: 6,
              border: "1px solid #cbd5e1", resize: "none",
              outline: "none", fontFamily: "inherit",
              color: "#374151",
            }}
          />
          <div style={{ display: "flex", gap: 5 }}>
            <button
              onClick={confirm}
              disabled={loading}
              style={{
                flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                border: "none", background: "#16a34a", color: "#fff",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "…" : "Xác nhận"}
            </button>
            <button
              onClick={() => { setShowNoteForm(false); setNoteInput(""); setError(null); }}
              disabled={loading}
              style={{
                padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "1px solid #e2e8f0",
                background: "#f9fafb", color: "#6b7280",
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Action button */}
      {!showNoteForm && (
        <button
          onClick={isDone ? reset : () => { setShowNoteForm(true); setError(null); }}
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
      )}

      {/* Error message */}
      {error && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, color: "#dc2626",
        }}>
          <AlertCircle size={11} strokeWidth={2.5} />
          {error}
        </span>
      )}

    </div>
  );
}
