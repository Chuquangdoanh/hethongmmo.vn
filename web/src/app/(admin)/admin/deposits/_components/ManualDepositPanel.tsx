"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
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

const PAGE_SIZE = 15;

export default function ManualDepositPanel() {
  const router = useRouter();
  const [query, setQuery]             = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [page, setPage]               = useState(1);
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [meta, setMeta]               = useState<Meta | null>(null);
  const [loading, setLoading]         = useState(true);

  // inline action
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [amount, setAmount]           = useState("");
  const [note, setNote]               = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMap, setSuccessMap]   = useState<Record<string, number>>({});
  const [isPending, startTransition]  = useTransition();

  // debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // fetch users
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (debouncedQ) p.set("search", debouncedQ);
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));

    fetch(`/api/admin/users?${p}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ data?: UserRow[]; meta?: Meta }>)
      .then((json) => { setUsers(json.data ?? []); setMeta(json.meta ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQ, page]);

  function openAction(id: string) {
    setActiveId(id); setAmount(""); setNote(""); setActionError(null);
  }
  function closeAction() { setActiveId(null); setActionError(null); }

  function handleDeposit(user: UserRow) {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 1_000) { setActionError("Tối thiểu 1.000đ"); return; }
    if (!note.trim() || note.trim().length < 3) { setActionError("Ghi chú tối thiểu 3 ký tự"); return; }
    setActionError(null);

    startTransition(async () => {
      const res  = await fetch("/api/admin/deposits/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user.email, amount: amt, note: note.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setActionError(json.error ?? "Lỗi không xác định"); return; }

      // Update balance locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, balance: String(Number(u.balance) + amt) } : u
        )
      );
      setSuccessMap((prev) => ({ ...prev, [user.id]: amt }));
      setActiveId(null);
      router.refresh();
    });
  }

  const displayAmt = amount.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-900">Nạp tiền thủ công</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Tìm user → +Nạp tiền → nhập số tiền & ghi chú → Xác nhận</p>
        </div>
        {meta && (
          <span className="text-[11px] text-amber-600 shrink-0">
            {meta.total.toLocaleString("vi-VN")} user
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm email hoặc tên user..."
            suppressHydrationWarning
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
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
            <div className="w-14 h-7 bg-gray-100 rounded-lg animate-pulse shrink-0" />
          </div>
        ))}

        {/* Empty */}
        {!loading && users.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            {debouncedQ ? `Không tìm thấy user khớp với "${debouncedQ}"` : "Chưa có user nào"}
          </div>
        )}

        {/* Rows */}
        {!loading && users.map((user) => {
          const isActive  = activeId === user.id;
          const lastAmt   = successMap[user.id];

          return (
            <div key={user.id}>
              {/* User row */}
              <div className={`px-4 py-3 flex items-center gap-3 transition-colors ${isActive ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-amber-800">
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
                  <p className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                    {formatVnd(Number(user.balance))}
                  </p>
                </div>

                {/* Action button */}
                <button
                  onClick={() => isActive ? closeAction() : openAction(user.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "border border-gray-200 text-gray-500 hover:bg-gray-100"
                      : lastAmt
                      ? "bg-emerald-100 text-emerald-700 cursor-default"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                  disabled={!!lastAmt && !isActive}
                >
                  {isActive ? "Hủy" : lastAmt ? `✓ +${formatVnd(lastAmt)}` : "+ Nạp tiền"}
                </button>
              </div>

              {/* Inline form */}
              {isActive && (
                <div className="px-4 pb-4 pt-2 bg-amber-50 border-t border-amber-100 space-y-2">
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
                        className="w-full px-3 py-2 pr-5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
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
                      className="flex-[2] min-w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
                    />

                    {/* Confirm */}
                    <button
                      onClick={() => handleDeposit(user)}
                      disabled={isPending || !amount || !note.trim()}
                      className="shrink-0 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? "..." : "Xác nhận"}
                    </button>
                  </div>

                  {/* Amount preview */}
                  {amount && parseInt(amount, 10) >= 1000 && (
                    <p className="text-[11px] text-amber-700">
                      Cộng <span className="font-bold">{formatVnd(parseInt(amount, 10))}</span> cho {user.fullName || user.email}
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
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-amber-400 disabled:opacity-40 transition-colors"
            >
              ‹ Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-amber-400 disabled:opacity-40 transition-colors"
            >
              Sau ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
