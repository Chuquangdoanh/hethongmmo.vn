"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatVnd } from "@/lib/utils/format";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { Banknote } from "lucide-react";
import {
  FiHome, FiShoppingBag, FiBookOpen, FiFolder, FiUser,
  FiSettings, FiLogOut, FiBell, FiHeart, FiPackage,
  FiHelpCircle, FiChevronRight, FiChevronDown, FiArrowLeft,
  FiAlertCircle, FiGrid, FiShield, FiLayers, FiBook, FiMessageCircle,
} from "react-icons/fi";
import MobileSupportPanel from "./MobileSupportPanel";

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
    icon: FiPackage,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    label: "Kho tài nguyên",
    desc: "Tài liệu, tool, ebook,...",
  },
  {
    id: "nguyen-lieu",
    href: "/tai-nguyen-mmo",
    icon: FiFolder,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    label: "Nguyên liệu",
    desc: "Tài nguyên làm MMO",
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MobileMenu({ navLinks: _navLinks, isLoggedIn, user, balance, avatarUrl, tutCategories = [], serviceCategories = [] }: Props) {
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [mounted, setMounted]         = useState(false);
  const navigatingRef                 = useRef(false);
  const pathname                      = usePathname();

  useEffect(() => { setMounted(true); }, []);

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
      icon: FiLayers,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      label: "Tut MMO",
      desc: "Hướng dẫn kiếm tiền online",
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
          {/* Xem tất cả */}
          <Link href="/dich-vu" prefetch={false} className="mnav-svc-viewall" onClick={closeWithNav}>
            <FiShoppingBag size={16} />
            Xem tất cả dịch vụ
            <FiChevronRight size={14} style={{ marginLeft: "auto" }} />
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
                      <img src={cat.iconUrl} alt={cat.name} className="mnav-svc-icon-img" />
                    ) : (
                      <FiShoppingBag size={20} style={{ color: "#7c3aed" }} />
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
          {userCard}

          {/* NỔI BẬT */}
          <div className="mnav-section">
            <p className="mnav-section-label">NỔI BẬT</p>
            <div className="mnav-featured-grid">
              <Link href="/dich-vu" prefetch={false} className="mnav-featured-card" onClick={closeWithNav}>
                <div className="mnav-featured-icon" style={{ background: "#ede9fe" }}>
                  <FiShoppingBag size={20} style={{ color: "#7c3aed" }} />
                </div>
                <div className="mnav-featured-name">DỊCH VỤ</div>
                <div className="mnav-featured-desc">Mua bán sản phẩm và dịch vụ MMO</div>
              </Link>
              <Link href="/khoa-hoc" prefetch={false} className="mnav-featured-card" onClick={closeWithNav}>
                <div className="mnav-featured-icon" style={{ background: "#d1fae5" }}>
                  <FiBookOpen size={20} style={{ color: "#059669" }} />
                </div>
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
                        <span className="mnav-list-icon" style={{ background: item.iconBg }}>
                          <Icon size={16} style={{ color: item.iconColor }} />
                        </span>
                        <div className="mnav-list-text">
                          <span className="mnav-list-name">{item.label}</span>
                          <span className="mnav-list-desc">{item.desc}</span>
                        </div>
                        {isExpanded
                          ? <FiChevronDown size={14} className="mnav-chevron mnav-chevron--open" />
                          : <FiChevronRight size={14} className="mnav-chevron" />}
                      </button>
                    ) : (
                      <Link href={item.href} prefetch={false} className="mnav-list-link" onClick={closeWithNav}>
                        <span className="mnav-list-icon" style={{ background: item.iconBg }}>
                          <Icon size={16} style={{ color: item.iconColor }} />
                        </span>
                        <div className="mnav-list-text">
                          <span className="mnav-list-name">{item.label}</span>
                          <span className="mnav-list-desc">{item.desc}</span>
                        </div>
                        <FiChevronRight size={14} className="mnav-chevron" />
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
            <FiArrowLeft size={16} />
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
            <FiAlertCircle size={15} />
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
            <FiArrowLeft size={16} />
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
            <div className="mnav-guest-actions">
              <Link href="/dang-nhap" prefetch={false} className="mnav-guest-btn mnav-guest-btn--login" onClick={closeWithNav}>
                Đăng nhập
              </Link>
              <Link href="/dang-ky" prefetch={false} className="mnav-guest-btn mnav-guest-btn--register" onClick={closeWithNav}>
                Đăng ký miễn phí
              </Link>
            </div>
          )}

          {isLoggedIn && (
            <>
              {/* Quản lý tài khoản */}
              <div className="mnav-section">
                <p className="mnav-section-label">QUẢN LÝ TÀI KHOẢN</p>
                <div className="mnav-acc-list">
                  <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <FiUser size={16} className="mnav-acc-icon" style={{ color: "#0066ff" }} />
                    <span>Ví của tôi</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/don-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <FiPackage size={16} className="mnav-acc-icon" style={{ color: "#7c3aed" }} />
                    <span>Đơn hàng của tôi</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/ho-tro" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <FiHeart size={16} className="mnav-acc-icon" style={{ color: "#ec4899" }} />
                    <span>Sản phẩm yêu thích</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                  <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                    <FiBell size={16} className="mnav-acc-icon" style={{ color: "#f59e0b" }} />
                    <span>Thông báo</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </Link>
                </div>
              </div>

              {/* Khu vực người bán */}
              {isSeller && (
                <div className="mnav-section">
                  <p className="mnav-section-label">KHU VỰC NGƯỜI BÁN</p>
                  <div className="mnav-acc-list">
                    <Link href="/ban-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <FiShoppingBag size={16} className="mnav-acc-icon" style={{ color: "#16a34a" }} />
                      <span>Seller Center</span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/ban-hang/san-pham" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <FiGrid size={16} className="mnav-acc-icon" style={{ color: "#16a34a" }} />
                      <span>Sản phẩm của tôi</span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/ban-hang/don-hang" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <FiPackage size={16} className="mnav-acc-icon" style={{ color: "#16a34a" }} />
                      <span>Đơn hàng </span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <button
                      className="mnav-acc-item mnav-acc-item--btn"
                      onClick={() => setActivePanel("seller-support")}
                    >
                      <FiAlertCircle size={16} className="mnav-acc-icon" style={{ color: "#dc2626" }} />
                      <span>Khiếu nại từ khách</span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
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
                      <FiShield size={16} className="mnav-acc-icon" style={{ color: "#7c3aed" }} />
                      <span>Admin Panel</span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                    <Link href="/thong-tin-ca-nhan" prefetch={false} className="mnav-acc-item" onClick={closeWithNav}>
                      <FiSettings size={16} className="mnav-acc-icon" style={{ color: "#64748b" }} />
                      <span>Cài đặt hệ thống</span>
                      <FiChevronRight size={14} className="mnav-acc-chevron" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Hỗ trợ khách hàng */}
              <div className="mnav-section">
                <p className="mnav-section-label">HỖ TRỢ KHÁCH HÀNG</p>
                <div className="mnav-acc-list">
                  <button
                    className="mnav-acc-item mnav-acc-item--btn"
                    onClick={() => setActivePanel("support")}
                  >
                    <FiMessageCircle size={16} className="mnav-acc-icon" style={{ color: "#0891b2" }} />
                    <span>Danh sách ticket hỗ trợ</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </button>
                  <button
                    className="mnav-acc-item mnav-acc-item--btn"
                    onClick={() => setActivePanel("support")}
                  >
                    <FiAlertCircle size={16} className="mnav-acc-icon" style={{ color: "#dc2626" }} />
                    <span>Khiếu nại đơn hàng</span>
                    <FiChevronRight size={14} className="mnav-acc-chevron" />
                  </button>
                </div>
              </div>

              {/* Đăng xuất */}
              <button
                className="mnav-logout-btn"
                onClick={() => { closePanel(); void signOut({ callbackUrl: "/" }); }}
              >
                <FiLogOut size={16} />
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
        >
          <FiHome size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Trang chủ</span>
        </Link>
        <button
          className={`mnav-tab${activePanel === "services" || (!isOpen && pathname.startsWith("/dich-vu")) ? " mnav-tab--active" : ""}`}
          onClick={() => openPanel("services")}
          aria-expanded={activePanel === "services"}
        >
          <FiShoppingBag size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Dịch vụ</span>
        </button>
        <Link
          href="/khoa-hoc"
          prefetch={false}
          className={`mnav-tab${!isOpen && pathname.startsWith("/khoa-hoc") ? " mnav-tab--active" : ""}`}
        >
          <FiBookOpen size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Khóa học</span>
        </Link>
        <button
          className={`mnav-tab${activePanel === "resources" ? " mnav-tab--active" : ""}`}
          onClick={() => openPanel("resources")}
          aria-expanded={activePanel === "resources"}
        >
          <FiFolder size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Tài nguyên</span>
        </button>
        <button
          className={`mnav-tab${activePanel === "account" ? " mnav-tab--active" : ""}`}
          onClick={() => openPanel("account")}
          aria-expanded={activePanel === "account"}
        >
          <FiUser size={22} className="mnav-tab-icon" />
          <span className="mnav-tab-label">Tài khoản</span>
        </button>
      </nav>
    </>
  );
}
