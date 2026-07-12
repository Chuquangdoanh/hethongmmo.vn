"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  affiliateCode: string | null;
  isAffiliate: boolean;
}

interface Props {
  /** Đường dẫn trang danh sách Affiliate — dùng để lọc danh sách bên dưới theo cùng từ khóa tìm kiếm */
  basePath: string;
  initialQuery?: string;
}

export default function GrantAffiliateForm({ basePath, initialQuery = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
    } else {
      setSearching(true);
    }

    const timer = setTimeout(async () => {
      // Lọc realtime danh sách Affiliate bên dưới theo cùng từ khóa — nếu tài khoản đã có sẵn sẽ hiện ngay
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("page");
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      const qs = sp.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });

      if (trimmed.length < 2) return;

      try {
        const res = await fetch(`/api/admin/affiliates/search-users?q=${encodeURIComponent(trimmed)}`, {
          credentials: "include",
        });
        const json = (await res.json()) as { data?: UserSearchResult[] };
        setResults(json.data ?? []);
        setShowResults(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectUser(user: UserSearchResult) {
    setSelectedUser(user);
    setQuery("");
    setResults([]);
    setShowResults(false);
    setError(null);
  }

  function clearSelection() {
    setSelectedUser(null);
  }

  async function handleSubmit() {
    if (!selectedUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra");
      setSelectedUser(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  if (selectedUser) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{selectedUser.fullName}</p>
            <p className="truncate text-xs text-gray-500">
              {selectedUser.email}
              {selectedUser.affiliateCode ? ` · ${selectedUser.affiliateCode}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
          >
            Đổi
          </button>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Cấp quyền"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setShowResults(true); }}
        placeholder="Tìm theo tên, email hoặc mã Affiliate..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
          {searching && (
            <p className="px-3 py-2 text-xs text-gray-400">Đang tìm...</p>
          )}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy tài khoản nào</p>
          )}
          {!searching && results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-violet-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {user.fullName}
                {user.isAffiliate && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    Đã là Affiliate
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {user.email}
                {user.affiliateCode ? ` · ${user.affiliateCode}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
