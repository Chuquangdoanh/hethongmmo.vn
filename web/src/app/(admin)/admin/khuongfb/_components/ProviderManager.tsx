"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, X, Plus, Trash2, Check, Loader2, Eye, EyeOff, RefreshCw, ImagePlus, Pencil } from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";

const LOGO_UPLOAD_URL = "/api/admin/upload/thumbnail?type=provider-logo";

export type ProviderType = "khuongfb" | "vncloud";

export interface ProviderInfo {
  id:           string;
  name:         string;
  providerType?: ProviderType;
  baseUrl?:     string;
  apiKey?:      string;  // masked
  apiUsername?: string;
  apiApp?:      string;
  apiSecret?:   string;  // masked
  enabled:      boolean;
  imageUrl?:    string | null;
  tierKey?:     string | null;
}

interface TierOption { key: string; label: string; }

interface Props {
  onProvidersChanged: () => void;
  /** Chỉ hiện/quản lý provider thuộc loại này — bỏ trống để hiện tất cả (hành vi cũ, dùng ở /admin/khuongfb) */
  filterType?: ProviderType;
  /** Loại mặc định chọn sẵn khi mở form thêm mới (vd. "vncloud" ở trang /admin/vps) */
  defaultAddType?: ProviderType;
}

export default function ProviderManager({ onProvidersChanged, filterType, defaultAddType }: Props) {
  const [open,      setOpen]      = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showKey,   setShowKey]   = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tiers, setTiers] = useState<TierOption[]>([]);

  const logoInputRef  = useRef<HTMLInputElement>(null);
  const logoTargetRef = useRef<string | null>(null);

  // Add form state
  const [newProviderType, setNewProviderType] = useState<ProviderType>(defaultAddType ?? "khuongfb");
  const [newName,        setNewName]        = useState("");
  const [newBaseUrl,     setNewBaseUrl]     = useState("");
  const [newApiKey,      setNewApiKey]      = useState("");
  const [newApiUsername, setNewApiUsername] = useState("");
  const [newApiApp,      setNewApiApp]      = useState("");
  const [newApiSecret,   setNewApiSecret]   = useState("");

  const ref = useRef<HTMLDivElement>(null);

  const visibleProviders = filterType ? providers.filter(p => (p.providerType ?? "khuongfb") === filterType) : providers;

  async function loadProviders() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/khuongfb/providers", { credentials: "include" });
      const json = await res.json() as { data?: ProviderInfo[] };
      setProviders(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadProviders();
    void (async () => {
      try {
        const res = await fetch("/api/admin/seller-tier-definitions", { credentials: "include" });
        const json = await res.json() as { data?: Array<{ key: string; label: string; isActive: boolean }> };
        setTiers((json.data ?? []).filter(t => t.isActive).map(t => ({ key: t.key, label: t.label })));
      } catch { /* bỏ qua — dropdown hạng sẽ rỗng */ }
    })();
  }, [open]);

  async function handleSetTier(p: ProviderInfo, tierKey: string) {
    const res = await fetch("/api/admin/khuongfb/providers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, tierKey }),
      credentials: "include",
    });
    if (res.ok) {
      await loadProviders();
      onProvidersChanged();
    }
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleToggleEnabled(p: ProviderInfo) {
    const res  = await fetch("/api/admin/khuongfb/providers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, enabled: !p.enabled }),
      credentials: "include",
    });
    if (res.ok) {
      await loadProviders();
      onProvidersChanged();
    }
  }

  async function handleSyncOne(p: ProviderInfo) {
    setSyncingId(p.id);
    setMsg(null);
    try {
      const res  = await fetch("/api/admin/khuongfb/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ providerId: p.id }),
        credentials: "include",
      });
      const json = await res.json() as {
        data?: { results: Record<string, { created: number; updated: number; deactivated: number; total: number; durationMs: number } | { error: string }> };
        error?: string;
      };
      if (!res.ok) {
        setMsg({ type: "err", text: `${p.name}: ${json.error ?? `HTTP ${res.status}`}` });
        return;
      }
      const r = json.data?.results[p.id];
      if (r && "error" in r) {
        setMsg({ type: "err", text: `${p.name}: ❌ ${r.error}` });
      } else if (r) {
        const duration = r.durationMs < 1000 ? `${r.durationMs}ms` : `${(r.durationMs / 1000).toFixed(1)}s`;
        setMsg({ type: "ok", text: `${p.name}: ✓ ${r.total} sp (mới: ${r.created}, cập nhật: ${r.updated}) — ${duration}` });
      }
      onProvidersChanged();
    } catch {
      setMsg({ type: "err", text: `${p.name}: Đồng bộ thất bại — không kết nối được server` });
    } finally {
      setSyncingId(null);
    }
  }

  function openLogoPicker(providerId: string) {
    logoTargetRef.current = providerId;
    logoInputRef.current?.click();
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const providerId = logoTargetRef.current;
    e.target.value = "";
    logoTargetRef.current = null;
    if (!file || !providerId) return;

    setUploadingLogoId(providerId);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes  = await fetch(LOGO_UPLOAD_URL, { method: "POST", credentials: "include", body: formData });
      const uploadJson = await uploadRes.json() as { data?: { url?: string }; error?: string };
      const imageUrl   = uploadJson.data?.url;
      if (!uploadRes.ok || !imageUrl) {
        setMsg({ type: "err", text: uploadJson.error ?? "Tải logo lên thất bại" });
        return;
      }

      const patchRes = await fetch("/api/admin/khuongfb/providers", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: providerId, imageUrl }),
        credentials: "include",
      });
      if (!patchRes.ok) {
        setMsg({ type: "err", text: "Lưu logo thất bại" });
        return;
      }
      setMsg({ type: "ok", text: "Đã cập nhật logo gian hàng" });
      await loadProviders();
      onProvidersChanged();
    } catch {
      setMsg({ type: "err", text: "Lỗi kết nối khi tải logo" });
    } finally {
      setUploadingLogoId(null);
    }
  }

  async function handleRemoveLogo(p: ProviderInfo) {
    if (!confirm(`Gỡ logo gian hàng "${p.name}"?`)) return;
    const res = await fetch("/api/admin/khuongfb/providers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, imageUrl: "" }),
      credentials: "include",
    });
    if (res.ok) {
      await loadProviders();
      onProvidersChanged();
    }
  }

  function startRename(p: ProviderInfo) {
    setRenamingId(p.id);
    setRenameValue(p.name);
  }

  async function saveRename(p: ProviderInfo) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === p.name) return;
    const res = await fetch("/api/admin/khuongfb/providers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, name }),
      credentials: "include",
    });
    if (res.ok) {
      await loadProviders();
      onProvidersChanged();
    }
  }

  async function handleDelete(p: ProviderInfo) {
    if (!confirm(`Xóa provider "${p.name}"? Toàn bộ sản phẩm đã đồng bộ từ provider này sẽ bị ẩn khỏi marketplace ngay lập tức (dữ liệu vẫn được giữ lại).`)) return;
    const res = await fetch(`/api/admin/khuongfb/providers?id=${p.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await loadProviders();
      onProvidersChanged();
    }
  }

  async function handleAdd() {
    if (!newName.trim()) {
      setMsg({ type: "err", text: "Điền tên gian hàng" });
      return;
    }
    if (newProviderType === "khuongfb" && (!newBaseUrl.trim() || !newApiKey.trim())) {
      setMsg({ type: "err", text: "Điền đầy đủ Base URL và API key" });
      return;
    }
    if (newProviderType === "vncloud" && (!newApiUsername.trim() || !newApiApp.trim() || !newApiSecret.trim())) {
      setMsg({ type: "err", text: "Điền đầy đủ API Username, API App và API Secret" });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const body = newProviderType === "vncloud"
        ? { name: newName.trim(), providerType: "vncloud", apiUsername: newApiUsername.trim(), apiApp: newApiApp.trim(), apiSecret: newApiSecret.trim() }
        : { name: newName.trim(), providerType: "khuongfb", baseUrl: newBaseUrl.trim(), apiKey: newApiKey.trim() };

      const res  = await fetch("/api/admin/khuongfb/providers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        credentials: "include",
      });
      const json = await res.json() as { data?: ProviderInfo; error?: string };
      if (!res.ok) {
        setMsg({ type: "err", text: json.error ?? "Thêm thất bại" });
        return;
      }
      setMsg({ type: "ok", text: `Đã thêm "${newName.trim()}"` });
      setNewName(""); setNewBaseUrl(""); setNewApiKey(""); setNewApiUsername(""); setNewApiApp(""); setNewApiSecret("");
      setShowAdd(false);
      await loadProviders();
      onProvidersChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Hidden input dùng chung cho upload logo mọi provider */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleLogoSelected(e)}
      />
      <button
        onClick={() => { setOpen(o => !o); setMsg(null); setShowAdd(false); }}
        title="Quản lý API providers"
        className={`p-2 rounded-lg border transition-colors ${
          open
            ? "bg-gray-900 border-gray-900 text-white"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
        }`}
      >
        <Settings size={16} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Quản lý API Providers</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {/* Danh sách providers */}
          <div className="px-4 pt-3 pb-2 space-y-2 max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-gray-400 py-2 text-center">Đang tải...</p>
            ) : visibleProviders.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">Chưa có provider nào</p>
            ) : visibleProviders.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border ${p.enabled ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200 bg-gray-50"}`}
              >
                {/* Toggle */}
                <button
                  onClick={() => void handleToggleEnabled(p)}
                  className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.enabled ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>

                {/* Logo gian hàng — click để upload, hover hiện nút gỡ */}
                <div className="relative shrink-0 group">
                  <button
                    type="button"
                    onClick={() => openLogoPicker(p.id)}
                    disabled={uploadingLogoId === p.id}
                    title="Đổi logo gian hàng"
                    className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-60"
                  >
                    {uploadingLogoId === p.id ? (
                      <Loader2 size={13} className="animate-spin text-gray-400" />
                    ) : p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r2Url(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={13} className="text-gray-300" />
                    )}
                  </button>
                  {p.imageUrl && uploadingLogoId !== p.id && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveLogo(p)}
                      title="Gỡ logo"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={9} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {renamingId === p.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void saveRename(p)}
                      onKeyDown={(e) => { if (e.key === "Enter") void saveRename(p); if (e.key === "Escape") setRenamingId(null); }}
                      className="w-full text-xs font-semibold text-gray-800 border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-gray-500"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1">
                      {p.name}
                      <button type="button" onClick={() => startRename(p)} title="Sửa tên gian hàng" className="text-gray-300 hover:text-gray-600 shrink-0">
                        <Pencil size={10} />
                      </button>
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 font-mono truncate">{p.baseUrl ?? p.apiUsername}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{p.apiKey ?? p.apiSecret}</p>
                  {/* Hạng gian hàng — gán từ danh sách SellerTierDefinition */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-gray-400 shrink-0">Hạng:</span>
                    <select
                      value={p.tierKey ?? ""}
                      onChange={(e) => void handleSetTier(p, e.target.value)}
                      className="flex-1 min-w-0 text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-700 focus:outline-none focus:border-gray-400"
                    >
                      <option value="">— Chưa gán —</option>
                      {tiers.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Đồng bộ riêng provider này */}
                <button
                  onClick={() => void handleSyncOne(p)}
                  disabled={syncingId === p.id}
                  className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-60"
                  title={`Đồng bộ riêng ${p.name}`}
                >
                  <RefreshCw size={13} className={syncingId === p.id ? "animate-spin" : ""} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => void handleDelete(p)}
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                  title="Xóa provider"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Thông báo kết quả — đồng bộ riêng lẻ hoặc thêm provider */}
          {msg && !showAdd && (
            <div className="px-4 pb-2">
              <p className={`text-[11px] font-medium ${msg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                {msg.text}
              </p>
            </div>
          )}

          {/* Thêm mới */}
          {showAdd ? (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2.5">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Thêm Provider mới</p>

              {!filterType && (
                <div className="flex gap-2">
                  {(["khuongfb", "vncloud"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewProviderType(t)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        newProviderType === t ? "bg-gray-900 border-gray-900 text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {t === "khuongfb" ? "Khuongfb-compatible" : "VNCloud"}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="Tên hiển thị (vd: Site 2)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400"
              />

              {newProviderType === "khuongfb" ? (
                <>
                  <input
                    type="text"
                    placeholder="Base URL (vd: https://site2.com/api)"
                    value={newBaseUrl}
                    onChange={e => setNewBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
                  />
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="API Key"
                      value={newApiKey}
                      onChange={e => setNewApiKey(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-9 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="API Username (email)"
                    value={newApiUsername}
                    onChange={e => setNewApiUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="API App"
                    value={newApiApp}
                    onChange={e => setNewApiApp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
                  />
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="API Secret"
                      value={newApiSecret}
                      onChange={e => setNewApiSecret(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-9 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </>
              )}

              {msg && (
                <p className={`text-[11px] font-medium ${msg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                  {msg.text}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => void handleAdd()}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Đang lưu...</> : <><Check size={12} /> Lưu</>}
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false); setMsg(null);
                    setNewName(""); setNewBaseUrl(""); setNewApiKey("");
                    setNewApiUsername(""); setNewApiApp(""); setNewApiSecret("");
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:border-gray-400 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setShowAdd(true); setMsg(null); setNewProviderType(defaultAddType ?? "khuongfb"); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 text-xs font-medium hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <Plus size={13} /> Thêm provider mới
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
