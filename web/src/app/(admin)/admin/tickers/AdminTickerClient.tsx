"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TickerText { id: string; text: string; displayOrder: number; isActive: boolean }

interface Props {
  texts: TickerText[];
}

export default function AdminTickerClient({ texts: initialTexts }: Props) {
  const router = useRouter();

  const [newText,    setNewText]    = useState("");
  const [addingText, setAddingText] = useState(false);

  async function addText(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setAddingText(true);
    try {
      await fetch("/api/admin/tickers/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText.trim() }),
      });
      setNewText("");
      router.refresh();
    } finally {
      setAddingText(false);
    }
  }

  async function deleteText(id: string) {
    await fetch(`/api/admin/tickers/texts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleText(id: string, current: boolean) {
    await fetch(`/api/admin/tickers/texts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Nội dung ticker</h2>

      <form onSubmit={addText} className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Nội dung thông báo ticker..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
        />
        <button
          type="submit"
          disabled={addingText || !newText.trim()}
          className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {addingText ? "Đang thêm…" : "Thêm"}
        </button>
      </form>

      <div className="space-y-2">
        {initialTexts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200">
            <button
              onClick={() => toggleText(t.id, t.isActive)}
              title={t.isActive ? "Đang hiện — bấm để ẩn" : "Đang ẩn — bấm để hiện"}
              className="shrink-0"
            >
              <span className={`h-2.5 w-2.5 rounded-full block transition-colors ${t.isActive ? "bg-[#10B981]" : "bg-[#D1D5DB]"}`} />
            </button>
            <p className="flex-1 text-sm text-gray-700 truncate">{t.text}</p>
            <button
              onClick={() => deleteText(t.id)}
              className="text-[10px] text-[#EF4444] hover:text-red-400 shrink-0 transition-colors"
            >
              Xóa
            </button>
          </div>
        ))}
        {initialTexts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Chưa có nội dung nào</p>
        )}
      </div>
    </div>
  );
}
