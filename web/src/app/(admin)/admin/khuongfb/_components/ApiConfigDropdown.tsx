"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, X, Check, Loader2 } from "lucide-react";

interface ConfigData {
  baseUrl:      string;
  apiKeyMasked: string;
  source:       "db" | "env";
}

export default function ApiConfigDropdown() {
  const [open,    setOpen]    = useState(false);
  const [config,  setConfig]  = useState<ConfigData | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey,  setApiKey]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Load config khi mở
  useEffect(() => {
    if (!open || config) return;
    void fetch("/api/admin/khuongfb/config", { credentials: "include" })
      .then((r) => r.json() as Promise<{ data?: ConfigData }>)
      .then(({ data }) => {
        if (!data) return;
        setConfig(data);
        setBaseUrl(data.baseUrl);
        setApiKey("");
      });
  }, [open, config]);

  // Click outside để đóng
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleSave() {
    if (!baseUrl.trim() || !apiKey.trim()) {
      setMsg({ type: "err", text: "Điền đầy đủ URL và API key" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res  = await fetch("/api/admin/khuongfb/config", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
        credentials: "include",
      });
      const json = await res.json() as { data?: { saved: boolean }; error?: string };
      if (!res.ok || !json.data?.saved) {
        setMsg({ type: "err", text: json.error ?? "Lưu thất bại" });
        return;
      }
      setMsg({ type: "ok", text: "Đã lưu — hiệu lực sau tối đa 60 giây" });
      setConfig(null); // force reload lần sau
      setApiKey("");
      setTimeout(() => setOpen(false), 1500);
    } catch {
      setMsg({ type: "err", text: "Lỗi kết nối" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setMsg(null); }}
        title="Cấu hình API Khuongfb"
        className={`p-2 rounded-lg border transition-colors ${
          open
            ? "bg-gray-900 border-gray-900 text-white"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
        }`}
      >
        <Settings size={16} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Header dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Cấu hình API</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Source badge */}
          {config && (
            <div className="px-4 pt-3 pb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                config.source === "db"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}>
                {config.source === "db" ? "Đang dùng cấu hình DB" : "Đang dùng .env"}
              </span>
            </div>
          )}

          {/* Form */}
          <div className="px-4 pb-4 pt-2 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://khuongfb.com/api"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">
                API Key
                {config?.apiKeyMasked && (
                  <span className="ml-2 text-gray-400 font-normal">Hiện tại: {config.apiKeyMasked}</span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập API key mới..."
                autoComplete="new-password"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
              />
            </div>

            {msg && (
              <p className={`text-[11px] font-medium ${msg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                {msg.text}
              </p>
            )}

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Đang lưu...</>
              ) : (
                <><Check size={13} /> Lưu cấu hình</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
