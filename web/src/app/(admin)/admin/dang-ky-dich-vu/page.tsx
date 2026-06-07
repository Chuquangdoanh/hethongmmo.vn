import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { StatusToggle } from "./_components/StatusToggle";
import { SearchInput } from "./_components/SearchInput";

export const metadata = { title: "Đăng ký dịch vụ — Admin" };

const LIMIT = 25;

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color, background: bg,
    }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
      padding: "18px 20px", flex: "1 1 0",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 800, color }}>{value}</p>
      <div style={{ width: 32, height: 3, borderRadius: 2, background: color, marginTop: 8, opacity: 0.4 }} />
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const lo = Math.max(2, current - 2);
  const hi = Math.min(total - 1, current + 2);
  if (lo > 2) pages.push("...");
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (hi < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default async function DangKyDichVuPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; status?: string; q?: string }>;
}) {
  const session = await auth();
  requireStaff(session);

  const params      = await searchParams;
  const tab         = params.tab === "fanpage" ? "fanpage" : "ads";
  const page        = Math.max(1, Number(params.page) || 1);
  const skip        = (page - 1) * LIMIT;
  const statusParam = params.status === "PENDING" || params.status === "DONE" ? params.status : undefined;
  const q           = params.q?.trim() || undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter applied to rows + filtered count only — stat cards stay unfiltered
  const filterWhere = {
    ...(statusParam ? { status: statusParam } : {}),
    ...(q ? { OR: [
      { name:  { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };

  /* ── ADS tab data ── */
  const [adsTotal, adsTodayCount, adsFbCount, adsPendingCount, adsFilteredCount, adsRows] = await Promise.all([
    prisma.adsRegistration.count(),
    prisma.adsRegistration.count({ where: { createdAt: { gte: today } } }),
    prisma.adsRegistration.count({ where: { serviceTab: "facebook" } }),
    prisma.adsRegistration.count({ where: { status: "PENDING" } }),
    tab === "ads"
      ? prisma.adsRegistration.count({ where: filterWhere })
      : Promise.resolve(0),
    tab === "ads"
      ? prisma.adsRegistration.findMany({ where: filterWhere, orderBy: { createdAt: "desc" }, skip, take: LIMIT })
      : Promise.resolve([]),
  ]);

  /* ── Fanpage tab data ── */
  const [fpTotal, fpTodayCount, fpMuaCount, fpPendingCount, fpFilteredCount, fpRows] = await Promise.all([
    prisma.fanpageRegistration.count(),
    prisma.fanpageRegistration.count({ where: { createdAt: { gte: today } } }),
    prisma.fanpageRegistration.count({ where: { serviceType: "MUA_PAGE" } }),
    prisma.fanpageRegistration.count({ where: { status: "PENDING" } }),
    tab === "fanpage"
      ? prisma.fanpageRegistration.count({ where: filterWhere })
      : Promise.resolve(0),
    tab === "fanpage"
      ? prisma.fanpageRegistration.findMany({ where: filterWhere, orderBy: { createdAt: "desc" }, skip, take: LIMIT })
      : Promise.resolve([]),
  ]);

  const filteredCount = tab === "ads" ? adsFilteredCount : fpFilteredCount;
  const totalPages    = Math.ceil(filteredCount / LIMIT);

  function tabUrl(t: string) {
    const sp = new URLSearchParams({ tab: t });
    if (statusParam) sp.set("status", statusParam);
    if (q) sp.set("q", q);
    return `/admin/dang-ky-dich-vu?${sp.toString()}`;
  }

  function filterUrl(newStatus?: string) {
    const sp = new URLSearchParams({ tab });
    if (newStatus) sp.set("status", newStatus);
    if (q) sp.set("q", q);
    return `/admin/dang-ky-dich-vu?${sp.toString()}`;
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams({ tab, page: String(p) });
    if (statusParam) sp.set("status", statusParam);
    if (q) sp.set("q", q);
    return `/admin/dang-ky-dich-vu?${sp.toString()}`;
  }

  const BUDGET_MAP: Record<string, string> = {
    "10-50m":    "10 – 50M",
    "50-100m":   "50 – 100M",
    "100-300m":  "100 – 300M",
    "300-500m":  "300 – 500M",
    "tren-500tr":"Trên 500M",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11,
    fontWeight: 700, color: "#64748b", textTransform: "uppercase",
    letterSpacing: "0.05em", whiteSpace: "nowrap",
    borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
  };
  const tdStyle: React.CSSProperties = {
    padding: "11px 14px", fontSize: 13, color: "#374151",
    borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  const STATUS_CHIPS = [
    { value: undefined,  label: "Tất cả" },
    { value: "PENDING",  label: "Chưa xử lý" },
    { value: "DONE",     label: "Đã xử lý" },
  ] as const;

  return (
    <div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
          Đăng ký dịch vụ
        </h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          Danh sách khách hàng đã đăng ký từ trang Quảng Cáo ADS và NETWORKS.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        {[
          { key: "ads",     label: "Quảng Cáo ADS", count: adsTotal },
          { key: "fanpage", label: "NETWORKS",         count: fpTotal  },
        ].map(({ key, label, count }) => (
          <Link
            key={key}
            href={tabUrl(key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", fontSize: 14, fontWeight: 700,
              textDecoration: "none", borderBottom: "2px solid transparent",
              marginBottom: -2,
              color:       tab === key ? "#0066ff" : "#64748b",
              borderColor: tab === key ? "#0066ff" : "transparent",
              transition: "all .15s",
            }}
          >
            {label}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px",
              fontSize: 11, fontWeight: 700,
              background: tab === key ? "#eff6ff" : "#f1f5f9",
              color:      tab === key ? "#2563eb" : "#64748b",
            }}>
              {count}
            </span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {tab === "ads" ? (
          <>
            <StatCard label="Tổng đăng ký"  value={adsTotal}        color="#0f172a" />
            <StatCard label="Hôm nay"        value={adsTodayCount}   color="#16a34a" />
            <StatCard label="Facebook Ads"   value={adsFbCount}      color="#1877f2" />
            <StatCard label="Chưa xử lý"    value={adsPendingCount} color="#b45309" />
          </>
        ) : (
          <>
            <StatCard label="Tổng đăng ký" value={fpTotal}         color="#0f172a" />
            <StatCard label="Hôm nay"       value={fpTodayCount}   color="#16a34a" />
            <StatCard label="Mua page"      value={fpMuaCount}     color="#7c3aed" />
            <StatCard label="Chưa xử lý"   value={fpPendingCount} color="#b45309" />
          </>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Trạng thái:</span>
          {STATUS_CHIPS.map(({ value, label }) => {
            const isActive = statusParam === value;
            return (
              <Link
                key={label}
                href={filterUrl(value)}
                style={{
                  padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  textDecoration: "none", transition: "all .15s",
                  background: isActive ? "#0066ff" : "#f1f5f9",
                  color:      isActive ? "#fff"    : "#64748b",
                  border:     isActive ? "none"    : "1px solid #e2e8f0",
                }}
              >
                {label}
              </Link>
            );
          })}
          {(statusParam ?? q) && (
            <Link
              href={`/admin/dang-ky-dich-vu?tab=${tab}`}
              style={{
                padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                textDecoration: "none", color: "#ef4444",
                background: "#fef2f2", border: "1px solid #fecaca",
              }}
            >
              ✕ Xóa lọc
            </Link>
          )}
        </div>
        <SearchInput />
      </div>

      {/* Result count — only shown when a filter is active */}
      {(statusParam ?? q) && (
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          <strong style={{ color: "#0f172a" }}>{filteredCount.toLocaleString("vi-VN")}</strong> kết quả
          {statusParam === "PENDING" ? " · Chưa xử lý" : statusParam === "DONE" ? " · Đã xử lý" : ""}
          {q ? ` · "${q}"` : ""}
        </p>
      )}

      {/* Table */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
        overflow: "hidden",
      }}>

        {/* ── ADS TABLE ── */}
        {tab === "ads" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Ngày đăng ký</th>
                  <th style={thStyle}>Họ tên</th>
                  <th style={thStyle}>SĐT</th>
                  <th style={thStyle}>Nền tảng</th>
                  <th style={thStyle}>Dịch vụ</th>
                  <th style={thStyle}>Ngành hàng</th>
                  <th style={thStyle}>Ngân sách</th>
                  <th style={thStyle}>Fanpage</th>
                  <th style={thStyle}>Content</th>
                  <th style={thStyle}>Kinh nghiệm Ads</th>
                </tr>
              </thead>
              <tbody>
                {adsRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ ...tdStyle, textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                      Không có kết quả nào.
                    </td>
                  </tr>
                ) : (
                  adsRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td style={tdStyle}>
                        <StatusToggle id={row.id} type="ads" initialStatus={row.status} />
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>
                        {formatDate(row.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>{row.name}</td>
                      <td style={tdStyle}>
                        <a href={`tel:${row.phone}`} style={{ color: "#0066ff", textDecoration: "none", fontWeight: 600 }}>
                          {row.phone}
                        </a>
                      </td>
                      <td style={tdStyle}>
                        {row.serviceTab === "facebook" ? (
                          <Badge color="#1d4ed8" bg="#eff6ff">Facebook Ads</Badge>
                        ) : (
                          <Badge color="#f8fafc" bg="#0f172a">TikTok Ads</Badge>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.serviceName}
                      </td>
                      <td style={tdStyle}>{row.productCategory}</td>
                      <td style={tdStyle}>
                        <Badge color="#7c3aed" bg="#f5f3ff">
                          {BUDGET_MAP[row.budget] ?? row.budget}
                        </Badge>
                      </td>
                      <td style={tdStyle}>
                        {row.fanpageStatus === "has" ? (
                          <Badge color="#16a34a" bg="#dcfce7">Đã có</Badge>
                        ) : (
                          <Badge color="#64748b" bg="#f1f5f9">Chưa có</Badge>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {row.hasContent === "has" ? (
                          <Badge color="#16a34a" bg="#dcfce7">Đã có</Badge>
                        ) : (
                          <Badge color="#64748b" bg="#f1f5f9">Chưa có</Badge>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {row.adsExperience === "has" ? (
                          <Badge color="#f97316" bg="#fff7ed">Đã từng</Badge>
                        ) : (
                          <Badge color="#64748b" bg="#f1f5f9">Chưa từng</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── FANPAGE TABLE ── */}
        {tab === "fanpage" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Ngày đăng ký</th>
                  <th style={thStyle}>Họ tên</th>
                  <th style={thStyle}>SĐT</th>
                  <th style={thStyle}>Loại</th>
                  <th style={thStyle}>Dịch vụ đăng ký</th>
                  <th style={thStyle}>Mô tả dịch vụ</th>
                </tr>
              </thead>
              <tbody>
                {fpRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                      Không có kết quả nào.
                    </td>
                  </tr>
                ) : (
                  fpRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td style={tdStyle}>
                        <StatusToggle id={row.id} type="fanpage" initialStatus={row.status} />
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>
                        {formatDate(row.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>{row.name}</td>
                      <td style={tdStyle}>
                        <a href={`tel:${row.phone}`} style={{ color: "#0066ff", textDecoration: "none", fontWeight: 600 }}>
                          {row.phone}
                        </a>
                      </td>
                      <td style={tdStyle}>
                        {row.serviceType === "MUA_PAGE" ? (
                          <Badge color="#7c3aed" bg="#f5f3ff">Mua page</Badge>
                        ) : (
                          <Badge color="#ea580c" bg="#fff7ed">Cấp page</Badge>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.serviceName}</td>
                      <td style={{ ...tdStyle, maxWidth: 280, whiteSpace: "normal", lineHeight: 1.5 }}>
                        {row.description.length > 120
                          ? row.description.slice(0, 120) + "…"
                          : row.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
          {page > 1 && (
            <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Trước</Link>
          )}
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: 14 }}>…</span>
            ) : (
              <Link key={p} href={pageUrl(p)} style={paginBtn(p === page)}>{p}</Link>
            )
          )}
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Sau →</Link>
          )}
        </div>
      )}
    </div>
  );
}

function paginBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 36, height: 36, borderRadius: 8, padding: "0 10px",
    fontSize: 13, fontWeight: active ? 700 : 500, textDecoration: "none",
    background: active ? "#0066ff" : "#fff",
    color: active ? "#fff" : "#374151",
    border: active ? "none" : "1px solid #e2e8f0",
  };
}
