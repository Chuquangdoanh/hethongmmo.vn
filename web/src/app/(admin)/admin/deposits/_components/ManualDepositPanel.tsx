"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/utils/format";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  balance: string;
  uidPrefix: string;
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

type ActionMode = "add" | "deduct";

interface Props {
  search: string;
}

const PAGE_SIZE = 15;

export default function ManualDepositPanel({ search }: Props) {
  const router = useRouter();
  const [page, setPage]               = useState(1);
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [meta, setMeta]               = useState<Meta | null>(null);
  const [loading, setLoading]         = useState(true);

  // inline action
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [activeMode, setActiveMode]   = useState<ActionMode>("add");
  const [amount, setAmount]           = useState("");
  const [note, setNote]               = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [resultMap, setResultMap]     = useState<Record<string, { mode: ActionMode; amount: number }>>({});
  const [isPending, startTransition]  = useTransition();

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  // Fetch users whenever search or page changes
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));

    fetch(`/api/admin/users?${p}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ data?: UserRow[]; meta?: Meta }>)
      .then((json) => { setUsers(json.data ?? []); setMeta(json.meta ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, page]);

  function openAction(id: string, mode: ActionMode) {
    setActiveId(id); setActiveMode(mode);
    setAmount(""); setNote(""); setActionError(null);
  }
  function closeAction() { setActiveId(null); setActionError(null); }

  function handleSubmit(user: UserRow) {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 1_000) { setActionError("Tối thiểu 1.000đ"); return; }
    if (!note.trim() || note.trim().length < 3) { setActionError("Ghi chú tối thiểu 3 ký tự"); return; }
    setActionError(null);

    const url = activeMode === "add"
      ? "/api/admin/deposits/manual"
      : "/api/admin/balance/deduct";

    startTransition(async () => {
      const res  = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user.email, amount: amt, note: note.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setActionError(json.error ?? "Lỗi không xác định"); return; }

      const delta = activeMode === "add" ? amt : -amt;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, balance: String(Number(u.balance) + delta) } : u
        )
      );
      setResultMap((prev) => ({ ...prev, [user.id]: { mode: activeMode, amount: amt } }));
      setActiveId(null);
      router.refresh();
    });
  }

  const displayAmt = amount.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const isDeduct   = activeMode === "deduct";

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <p className="text-sm font-bold text-gray-900 flex-1">Nạp / Trừ tiền thủ công</p>
        {meta && (
          <span className="text-[11px] text-gray-400 shrink-0">
            {meta.total.toLocaleString("vi-VN")} user
          </span>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {/* Skeleton */}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-28" />
              <div className="h-2.5 bg-gray-100 rounded animate-pulse w-44" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-14 h-7 bg-gray-100 rounded-lg animate-pulse" />
              <div className="w-14 h-7 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}

        {/* Empty */}
        {!loading && users.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            {search ? `Không tìm thấy user khớp với "${search}"` : "Chưa có user nào"}
          </div>
        )}

        {/* Rows */}
        {!loading && users.map((user) => {
          const isActive   = activeId === user.id;
          const lastResult = resultMap[user.id];

          return (
            <div key={user.id}>
              {/* User row */}
              <div className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                isActive
                  ? isDeduct ? "bg-red-50" : "bg-emerald-50"
                  : "hover:bg-gray-50"
              }`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-gray-600">
                    {(user.fullName || user.email)[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName || "—"}</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{user.email}</p>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0 mr-1 hidden sm:block">
                  <p className="text-[10px] text-gray-400">Số dư</p>
                  <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    {formatVnd(Number(user.balance))}
                  </p>
                </div>

                {/* Action buttons */}
                {isActive ? (
                  <button
                    onClick={closeAction}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Hủy
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lastResult && (
                      <span className={`text-xs font-semibold ${lastResult.mode === "add" ? "text-emerald-600" : "text-red-500"}`}>
                        {lastResult.mode === "add" ? "+" : "−"}{formatVnd(lastResult.amount)} ✓
                      </span>
                    )}
                    <button
                      onClick={() => openAction(user.id, "add")}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                    >
                      +Nạp
                    </button>
                    <button
                      onClick={() => openAction(user.id, "deduct")}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                    >
                      −Trừ
                    </button>
                  </div>
                )}
              </div>

              {/* Inline form */}
              {isActive && (
                <div className={`px-4 pb-4 pt-2 border-t space-y-2 ${
                  isDeduct
                    ? "bg-red-50 border-red-100"
                    : "bg-emerald-50 border-emerald-100"
                }`}>
                  <p className={`text-[11px] font-semibold ${isDeduct ? "text-red-600" : "text-emerald-700"}`}>
                    {isDeduct
                      ? `Trừ tiền từ số dư của ${user.fullName || user.email}`
                      : `Nạp tiền vào số dư của ${user.fullName || user.email}`}
                  </p>

                  <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                    {/* Amount */}
                    <div className="relative flex-1 min-w-32">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={displayAmt}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                        placeholder="Số tiền (VNĐ)"
                        suppressHydrationWarning
                        autoFocus
                        className="w-full px-3 py-2 pr-5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">đ</span>
                    </div>

                    {/* Note */}
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú lý do (bắt buộc)"
                      suppressHydrationWarning
                      className="flex-2 min-w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />

                    {/* Confirm */}
                    <button
                      onClick={() => handleSubmit(user)}
                      disabled={isPending || !amount || !note.trim()}
                      className={`shrink-0 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-colors ${
                        isDeduct
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                    >
                      {isPending ? "..." : "Xác nhận"}
                    </button>
                  </div>

                  {/* Preview */}
                  {amount && parseInt(amount, 10) >= 1000 && (
                    <p className={`text-[11px] ${isDeduct ? "text-red-600" : "text-emerald-700"}`}>
                      {isDeduct ? "Trừ" : "Cộng"}{" "}
                      <span className="font-bold">{formatVnd(parseInt(amount, 10))}</span>
                      {isDeduct && Number(user.balance) < parseInt(amount, 10) && (
                        <span className="text-red-500 ml-1">
                          — Số dư không đủ ({formatVnd(Number(user.balance))})
                        </span>
                      )}
                    </p>
                  )}

                  {/* Error */}
                  {actionError && (
                    <p className="text-[11px] text-red-500">{actionError}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            Trang {meta.page}/{meta.totalPages} · {meta.total.toLocaleString("vi-VN")} user
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              ‹ Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              Sau ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
