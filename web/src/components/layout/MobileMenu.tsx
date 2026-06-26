"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import {
  Banknote, Home, GalleryVerticalEnd, GraduationCap, Lightbulb, FolderOpen,
  Package, ShoppingBag, User, Settings, LogOut, Bell,
  Heart, Store, ChevronRight, ChevronDown, ArrowLeft, AlertCircle,
  Grid3x3, LayoutDashboard, TicketCheck, BookOpen, RotateCcw, Headphones, Award,
} from "lucide-react";
import MobileSupportPanel from "./MobileSupportPanel";
import { r2Url } from "@/lib/utils/image-url";

interface NavLink {
  href: string;
  label: string;
  color?: string;
  shadow?: string;
  isFeatured?: boolean;
}

interface Props {
  navLinks: NavLink[];
  isLoggedIn: boolean;
  user?: AuthenticatedUser;
  balance?: number | null;
  avatarUrl?: string | null;
  tutCategories?: { name: string }[];
  serviceCategories?: { name: string; iconUrl: string | null }[];
}

type PanelType = "services" | "resources" | "account" | "support" | "seller-support";

interface ResourceItem {
  id: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  children: { label: string; href: string }[];
}

// Tut MMO children được build động từ tutCategories (truyền từ server)
const STATIC_RESOURCE_ITEMS: Omit<ResourceItem, "children">[] = [
  {
    id: "kho-tai-nguyen",
    href: "/kho-tai-nguyen",
    icon: Package,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    label: "KHO TÀI NGUYÊN",
    desc: "Hệ Thống Bán Kho Facebook | Fanpage | Kênh Tik Tok...",
  },
  {
    id: "nguyen-lieu",
    href: "/tai-nguyen-mmo",
    icon: FolderOpen,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    label: "NGUYÊN LIỆU",
    desc: "VIA | Fanpage | BM | Tài Khoản Pro | Fake IP....",
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MobileMenu({ navLinks: _navLinks, isLoggedIn, user, balance, avatarUrl, tutCategories = [], serviceCategories = [] }: Props) {
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigatingRef                 = useRef(false);
  const pathname                      = usePathname();

  useEffect(() => { setMounted(true); }, []);

  // Poll unread notification count (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch("/api/user/notifications?limit=1&excludeSystem=1", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { meta?: { unreadCount?: number } };
        setUnreadCount(json.meta?.unreadCount ?? 0);
      } catch { /* bỏ qua lỗi mạng */ }
    }
    const timer = setTimeout(() => { void fetchCount(); }, 1_500);
    const id = setInterval(() => { void fetchCount(); }, 30_000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(id); };
  }, [isLoggedIn]);

  // Close panels on route change
  useEffect(() => {
    setActivePanel(null);
    setExpanded(null);
  }, [pathname]);

  const isOpen = activePanel !== null;

  // Scroll lock — same mechanism as before (CSS var + class)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty("--menu-scroll-y", `-${scrollY}px`);
    document.body.classList.add("menu-open");
    return () => {
      document.body.classList.remove("menu-open");
      document.documentElement.style.removeProperty("--menu-scroll-y");
      if (!navigatingRef.current) window.scrollTo(0, scrollY);
      navigatingRef.current = false;
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActivePanel(null); setExpanded(null); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [isOpen]);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setExpanded(null);
  }, []);

  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const closeWithNav = useCallback(() => {
    navigatingRef.current = true;
    closePanel();
  }, [closePanel]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  const initials   = user ? (user.fullName || user.email).slice(0, 2).toUpperCase() : "";
  const balanceStr = mounted && balance != null ? formatVnd(balance) : null;
  const isSeller   = (user?.role === "SELLER" && user?.sellerStatus === "APPROVED") || user?.role === "STAFF" || user?.role === "ADMIN";
  const isAdmin    = user?.role === "ADMIN" || user?.role === "STAFF";

  // Build resource list: Tut MMO với children từ CMS, sau đó các mục tĩnh
  const resourceItems: ResourceItem[] = [
    {
      id: "tut-mmo",
      href: "/tut-tricks",
      icon: Lightbulb,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      label: "TUT MMO",
      desc: "Cung Cấp TUT + Thủ Thuật Các Nền Tảng Facebook + Tik Tok...",
      children: tutCategories.map((c) => ({
        label: c.name,
        href: `/tut-tricks?category=${encodeURIComponent(c.name)}`,
      })),
    },
    ...STATIC_RESOURCE_ITEMS.map((item) => ({ ...item, children: [] as { label: string; href: string }[] })),
  ];

  /* ── Shared user card ── */
  const userCard = isLoggedIn && user ? (
    <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-user-card" onClick={closeWithNav}>
      <div className="mnav-avatar">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={user.fullName ?? ""} className="mnav-avatar-img" />
        ) : (
          <span className="mnav-initials">{initials}</span>
        )}
        <span className="mnav-dot" />
      </div>
      <div className="mnav-user-info">
        <div className="mnav-user-name">{user.fullName ?? user.email}</div>
        <div className="mnav-user-email">{user.email}</div>
        {balanceStr && (
          <div className="mnav-balance">
            <Banknote size={10} strokeWidth={2} />
            {balanceStr}
          </div>
        )}
      </div>
    </Link>
  ) : null;

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className={`mnav-overlay${isOpen ? " mnav-overlay--open" : ""}`}
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* ── Services Panel ── */}
      <div
        className={`mnav-panel${activePanel === "services" ? " mnav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn danh mục dịch vụ"
        aria-hidden={activePanel !== "services"}
      >
        <div className="mnav-panel-head">
          <span className="mnav-panel-title">Danh mục dịch vụ</span>
          <button className="mnav-panel-close" onClick={closePanel} aria-label="Đóng menu">✕</button>
        </div>
        <div className="mnav-panel-body">
          {/* Banner dịch vụ */}
          <Link href="/dich-vu" prefetch={false} className="mnav-svc-banner" onClick={closeWithNav}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/pagecm.jpg" alt="" className="mnav-res-banner-bg" aria-hidden="true" />
            <div className="mnav-svc-banner-text">
              <p className="mnav-svc-banner-title">
                Dịch vụ <ChevronRight size={13} className="mnav-res-banner-arrow" />
              </p>
              <p className="mnav-svc-banner-desc">Xem tất cả dịch vụ MMO</p>
            </div>
            <div className="mnav-banner-trust">
              <div className="mnav-banner-trust-item">
                <RotateCcw size={15} className="mnav-banner-trust-icon--green" />
                <div>
                  <p className="mnav-banner-trust-name">Hoàn tiền 100%</p>
                  <p className="mnav-banner-trust-sub">Nếu không hài lòng</p>
                </div>
              </div>
              <div className="mnav-banner-trust-item">
                <Headphones size={15} className="mnav-banner-trust-icon--blue" />
                <div>
                  <p className="mnav-banner-trust-name">Hỗ trợ 24/7</p>
                  <p className="mnav-banner-trust-sub">Đội ngũ luôn sẵn sàng</p>
                </div>
              </div>
              <div className="mnav-banner-trust-item">
                <Award size={15} className="mnav-banner-trust-icon--orange" />
                <div>
                  <p className="mnav-banner-trust-name">Uy tín hàng đầu</p>
                  <p className="mnav-banner-trust-sub">Cộng đồng MMO lớn mạnh</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Danh sách danh mục từ CMS */}
          {serviceCategories.length > 0 ? (
            <div className="mnav-svc-grid">
              {serviceCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/dich-vu?category=${encodeURIComponent(cat.name)}`}
                  prefetch={false}
                  className="mnav-svc-card"
                  onClick={closeWithNav}
                >
                  <div className="mnav-svc-icon">
                    {cat.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r2Url(cat.iconUrl)} alt={cat.name} className="mnav-svc-icon-img" />
                    ) : (
                      <ShoppingBag size={20} />
                    )}
                  </div>
                  <span className="mnav-svc-name">{cat.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mnav-svc-empty">Chưa có danh mục dịch vụ nào.</p>
          )}
        </div>
      </div>

      {/* ── Resources Panel ── */}
      <div
        className={`mnav-panel${activePanel === "resources" ? " mnav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tài nguyên"
        aria-hidden={activePanel !== "resources"}
      >
        <div className="mnav-panel-head">
          <span className="mnav-panel-title">Tài nguyên</span>
          <button className="mnav-panel-close" onClick={closePanel} aria-label="Đóng menu">✕</button>
        </div>
        <div className="mnav-panel-body">
          {/* Banner hero card */}
          <div className="mnav-res-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Tuttrick.jpg" alt="" className="mnav-res-banner-bg" aria-hidden="true" />
            <div className="mnav-res-banner-text">
              <p className="mnav-res-banner-title">
                Tài nguyên <ChevronRight size={14} className="mnav-res-banner-arrow" />
              </p>
              <p className="mnav-res-banner-desc">Khám phá, học hỏi và phát triển kỹ năng MMO mỗi ngày.</p>
            </div>
            <div className="mnav-banner-trust">
              <div className="mnav-banner-trust-item">
                <RotateCcw size={15} className="mnav-banner-trust-icon--green" />
                <div>
                  <p className="mnav-banner-trust-name">Hoàn tiền 100%</p>
                  <p className="mnav-banner-trust-sub">Nếu không hài lòng</p>
                </div>
              </div>
              <div className="mnav-banner-trust-item">
                <Headphones size={15} className="mnav-banner-trust-icon--blue" />
                <div>
                  <p className="mnav-banner-trust-name">Hỗ trợ 24/7</p>
                  <p className="mnav-banner-trust-sub">Đội ngũ luôn sẵn sàng</p>
                </div>
              </div>
              <div className="mnav-banner-trust-item">
                <Award size={15} className="mnav-banner-trust-icon--orange" />
                <div>
                  <p className="mnav-banner-trust-name">Uy tín hàng đầu</p>
                  <p className="mnav-banner-trust-sub">Cộng đồng MMO lớn mạnh</p>
                </div>
              </div>
            </div>
          </div>

          {/* NỔI BẬT */}
          <div className="mnav-section">
            <p className="mnav-section-label">NỔI BẬT</p>
            <div className="mnav-featured-grid">
              <Link href="/dich-vu" prefetch={false} className="mnav-featured-card" onClick={closeWithNav}>
                <div className="mnav-featured-icon"><GalleryVerticalEnd size={20} /></div>
                <div className="mnav-featured-name">DỊCH VỤ</div>
                <div className="mnav-featured-desc">Mua bán sản phẩm và dịch vụ MMO</div>
              </Link>
              <Link href="/khoa-hoc" prefetch={false} className="mnav-featured-card" onClick={closeWithNav}>
                <div className="mnav-featured-icon"><GraduationCap size={20} /></div>
                <div className="mnav-featured-name">KHÓA HỌC</div>
                <div className="mnav-featured-desc">Học tập và phát triển kỹ năng</div>
              </Link>
            </div>
          </div>

          {/* TÀI NGUYÊN accordion */}
          <div className="mnav-section">
            <p className="mnav-section-label">TÀI NGUYÊN</p>
            <div className="mnav-list">
              {resourceItems.map((item) => {
                const isExpanded  = expanded === item.id;
                const hasChildren = item.children.length > 0;
                const Icon        = item.icon;
                return (
                  <div key={item.id} className="mnav-list-item-wrap">
                    {hasChildren ? (
                      <button
                        className="mnav-list-link mnav-list-link--expandable"
                        onClick={() => toggleExpanded(item.id)}
                        aria-expanded={isExpanded}
                      >
                        <span className="mnav-list-icon">
                          <Icon size={16} />
                        </span>
                        <div className="mnav-list-text">
                          <span className="mnav-list-name">{item.label}</span>
                          <span className="mnav-list-desc">{item.desc}</span>
                        </div>
                        {isExpanded
                          ? <ChevronDown size={14} className="mnav-chevron mnav-chevron--open" />
                          : <ChevronRight size={14} className="mnav-chevron" />}
                      </button>
                    ) : (
                      <Link href={item.href} prefetch={false} className="mnav-list-link" onClick={closeWithNav}>
                        <span className="mnav-list-icon">
                          <Icon size={16} />
                        </span>
                        <div className="mnav-list-text">
                          <span className="mnav-list-name">{item.label}</span>
                          <span className="mnav-list-desc">{item.desc}</span>
                        </div>
                        <ChevronRight size={14} className="mnav-chevron" />
                      </Link>
                    )}
                    {hasChildren && isExpanded && (
                      <div className="mnav-accordion-body">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            prefetch={false}
                            className="mnav-accordion-item"
                            onClick={closeWithNav}
                          >
                            {child.label}
                          </Link>
                        ))}
                        <Link href={item.href} prefetch={false} className="mnav-accordion-item mnav-accordion-view-all" onClick={closeWithNav}>
                          Xem tất cả →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Support Panel ── */}
      <div
        className={`mnav-panel${activePanel === "support" ? " mnav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ticket hỗ trợ"
        aria-hidden={activePanel !== "support"}
      >
        <div className="mnav-panel-head">
          <button
            className="mnav-panel-back"
            onClick={() => setActivePanel("account")}
            aria-label="Quay lại tài khoản"
          >
            <ArrowLeft size={16} />
            <span>Tài khoản</span>
          </button>
          <button className="mnav-panel-close" onClick={closePanel} aria-label="Đóng menu">✕</button>
        </div>

        <div className="mnav-panel-body">
          <div className="mnav-section">
            <p className="mnav-section-label">DANH SÁCH YÊU CẦU HỖ TRỢ</p>
            <MobileSupportPanel
              isOpen={activePanel === "support"}
              onNav={closeWithNav}
            />
          </div>

          {/* Tạo khiếu nại mới */}
          <Link
            href="/don-hang"
            prefetch={false}
            className="mnav-support-cta"
            onClick={closeWithNav}
          >
            <AlertCircle size={15} />
            Khiếu nại đơn hàng mới
          </Link>
        </div>
      </div>

      {/* ── Seller Support Panel ── */}
      <div
        className={`mnav-panel${activePanel === "seller-support" ? " mnav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Khiếu nại từ khách"
        aria-hidden={activePanel !== "seller-support"}
      >
        <div className="mnav-panel-head">
          <button
            className="mnav-panel-back"
            onClick={() => setActivePanel("account")}
            aria-label="Quay lại tài khoản"
          >
            <ArrowLeft size={16} />
            <span>Tài khoản</span>
          </button>
          <button className="mnav-panel-close" onClick={closePanel} aria-label="Đóng menu">✕</button>
        </div>

        <div className="mnav-panel-body">
          <div className="mnav-section">
            <p className="mnav-section-label">KHIẾU NẠI TỪ KHÁCH HÀNG</p>
            <MobileSupportPanel
              isOpen={activePanel === "seller-support"}
              onNav={closeWithNav}
              apiUrl="/api/seller/complaints"
              detailBase="/ban-hang/khieu-nai"
              statusLabels={{
                IN_REVIEW:     "Đang đàm phán",
                PENDING_ADMIN: "Chờ admin",
                RESOLVED:      "Đã hoàn thành",
                REJECTED:      "Hoàn tiền khách",
              }}
              emptyText="Chưa có khiếu nại nào từ khách hàng"
            />
          </div>
        </div>
      </div>

      {/* ── Account Panel ── */}
      <div
        className={`mnav-panel${activePanel === "account" ? " mnav-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tài khoản"
        aria-hidden={activePanel !== "account"}
      >
        <div className="mnav-panel-head">
          <span className="mnav-panel-title">Tài khoản</span>
          <button className="mnav-panel-close" onClick={closePanel} aria-label="Đóng menu">✕</button>
        </div>
        <div className="mnav-panel-body">
          {isLoggedIn && user ? userCard : (
            <div className="mnav-guest-branding">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/djmedia-logo.gif" alt="hethongmmo.vn" className="mnav-guest-logo" />
              <p className="mnav-guest-headline cqd-hud-frame">HỆ THỐNG MMO</p>
              <div className="mnav-guest-actions">
                <Link href="/dang-nhap" prefetch={false} className="mnav-guest-btn mnav-guest-btn--login" onClick={closeWithNav}>
                  Đăng nhập
                </Link>
                <Link href="/dang-ky" prefetch={false} className="mnav-guest-btn mnav-guest-btn--register" onClick={closeWithNav}>
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>
          )}

          {isLoggedIn && (
            <>
              {/* Quản lý tài khoản */}
              <div className="mnav-section">
                <p className="mnav-section-label">QUẢN LÝ TÀI KHOẢN</p>
                <div className="mnav-acc-list">
                  <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <span className="mnav-acc-icon-badge"><User size={16} /></span>
                    <span>Ví của tôi</span>
                    <ChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/don-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <span className="mnav-acc-icon-badge"><Package size={16} /></span>
                    <span>Đơn hàng của tôi</span>
                    <ChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/ho-tro" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <span className="mnav-acc-icon-badge"><TicketCheck size={16} /></span>
                    <span>Ticket hỗ trợ</span>
                    <ChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/not-found" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <span className="mnav-acc-icon-badge"><Heart size={16} /></span>
                    <span>Sản phẩm yêu thích</span>
                    <ChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/thong-bao" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <span className="mnav-acc-icon-badge" style={{ position: "relative" }}>
                      <Bell size={16} />
                      {unreadCount > 0 && (
                        <span style={{
                          position: "absolute", top: "-4px", right: "-4px",
                          minWidth: "14px", height: "14px",
                          background: "#ef4444", color: "#fff",
                          fontSize: "8px", fontWeight: 700,
                          borderRadius: "999px", padding: "0 2px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1, outline: "1.5px solid #fff",
                        }}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                    <span>Thông báo</span>
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: "auto", marginRight: "4px",
                        fontSize: "10px", fontWeight: 700,
                        background: "#ef4444", color: "#fff",
                        borderRadius: "20px", padding: "1px 6px",
                      }}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    <ChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                </div>
              </div>

              {/* Khu vực người bán */}
              {isSeller && (
                <div className="mnav-section">
                  <p className="mnav-section-label">KHU VỰC NGƯỜI BÁN</p>
                  <div className="mnav-acc-list">
                    <Link href="/ban-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <span className="mnav-acc-icon-badge"><Store size={16} /></span>
                      <span>Seller Center</span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/ban-hang/san-pham" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <span className="mnav-acc-icon-badge"><Grid3x3 size={16} /></span>
                      <span>Sản phẩm của tôi</span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/ban-hang/don-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <span className="mnav-acc-icon-badge"><Package size={16} /></span>
                      <span>Đơn hàng </span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <button
                      className="mnav-acc-item mnav-acc-item--btn"
                      onClick={() => setActivePanel("seller-support")}
                    >
                      <span className="mnav-acc-icon-badge"><AlertCircle size={16} /></span>
                      <span>Khiếu nại từ khách</span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quản trị hệ thống */}
              {isAdmin && (
                <div className="mnav-section">
                  <p className="mnav-section-label">QUẢN TRỊ HỆ THỐNG</p>
                  <div className="mnav-acc-list">
                    <Link href="/admin/dashboard" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <span className="mnav-acc-icon-badge"><LayoutDashboard size={16} /></span>
                      <span>Admin Panel</span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <span className="mnav-acc-icon-badge"><Settings size={16} /></span>
                      <span>Cài đặt hệ thống</span>
                      <ChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                  </div>
                </div>
              )}

              
            

              {/* Đăng xuất */}
              <button
                className="mnav-logout-btn"
                onClick={() => { closePanel(); void signOut({ callbackUrl: "/" }); }}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="mnav-bottom" aria-label="Menu điều hướng chính">
        <Link
          href="/"
          prefetch={false}
          className={`mnav-tab${!isOpen && pathname === "/" ? " mnav-tab--active" : ""}`}
          onClick={closeWithNav}
        >
          <Home size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Trang chủ</span>
        </Link>
        <button
          className={`mnav-tab${activePanel === "services" || (!isOpen && pathname.startsWith("/dich-vu")) ? " mnav-tab--active" : ""}`}
          onClick={() => openPanel("services")}
          aria-expanded={activePanel === "services"}
        >
          <GalleryVerticalEnd size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Dịch vụ</span>
        </button>
        <Link
          href="/khoa-hoc"
          prefetch={false}
          className={`mnav-tab${!isOpen && pathname.startsWith("/khoa-hoc") ? " mnav-tab--active" : ""}`}
          onClick={closeWithNav}
        >
          <GraduationCap size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Khóa học</span>
        </Link>
        <button
          className={`mnav-tab${activePanel === "resources" ? " mnav-tab--active" : ""}`}
          onClick={() => openPanel("resources")}
          aria-expanded={activePanel === "resources"}
        >
          <FolderOpen size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Tài nguyên</span>
        </button>
        {isLoggedIn ? (
          <button
            className={`mnav-tab${activePanel === "account" ? " mnav-tab--active" : ""}`}
            onClick={() => openPanel("account")}
            aria-expanded={activePanel === "account"}
          >
            <User size={22} className="mnav-tab-icon" />
            <span className="mnav-tab-label">Tài khoản</span>
          </button>
        ) : (
          <Link
            href="/dang-nhap"
            prefetch={false}
            className={`mnav-tab${!isOpen && (pathname === "/dang-nhap" || pathname === "/dang-ky") ? " mnav-tab--active" : ""}`}
            onClick={closeWithNav}
          >
            <User size={22} className="mnav-tab-icon" />
            <span className="mnav-tab-label">Tài khoản</span>
          </Link>
        )}
      </nav>
    </>
  );
}
