"use client";

import { useState } from "react";

interface Props {
  bannedKeywords: string[];
}

export default function ChatModerationClient({ bannedKeywords: initialKeywords }: Props) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveKeywords(next: string[]) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/system-config/chat-moderation", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannedKeywords: next }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Lưu thất bại"); return; }
      setKeywords(next);
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    await saveKeywords([...keywords, trimmed]);
    setNewKeyword("");
  }

  async function removeKeyword(keyword: string) {
    await saveKeywords(keywords.filter((k) => k !== keyword));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Danh sách từ khóa cấm</h2>

      <form onSubmit={addKeyword} className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Ví dụ: zalo, telegram, ngoài sàn..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !newKeyword.trim()}
          className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {saving ? "Đang lưu…" : "Thêm"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-700"
          >
            {k}
            <button
              onClick={() => void removeKeyword(k)}
              disabled={saving}
              className="text-[10px] text-[#EF4444] hover:text-red-400 transition-colors"
            >
              Xóa
            </button>
          </span>
        ))}
        {keywords.length === 0 && (
          <p className="text-sm text-gray-400 py-4">Chưa có từ khóa cấm nào.</p>
        )}
      </div>
    </div>
  );
}
