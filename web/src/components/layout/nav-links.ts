import {
  Home, GalleryVerticalEnd, GraduationCap, Lightbulb, FolderOpen, Wrench, Megaphone, Globe, Info,
  type LucideIcon,
} from "lucide-react";

export interface NavLinkDef {
  href: string;
  label: string;
  color: string;
  shadow: string;
}

export const NAV_LINKS: NavLinkDef[] = [
  { href: "/",               label: "TRANG CHỦ",      color: "#0066ff", shadow: "rgba(0,102,255,0.45)"  },
  { href: "/dich-vu",        label: "DỊCH VỤ",        color: "#7c3aed", shadow: "rgba(124,58,237,0.45)" },
  { href: "/khoa-hoc",       label: "KHÓA HỌC",       color: "#059669", shadow: "rgba(5,150,105,0.45)"  },
  { href: "/tut-tricks",     label: "TUT MMO",        color: "#dc2626", shadow: "rgba(220,38,38,0.45)"  },
  { href: "/tai-nguyen-mmo", label: "NGUYÊN LIỆU",    color: "#f59e0b", shadow: "rgba(245,158,11,0.45)" },
  { href: "/tool-phan-mem",  label: "TOOL - PHẦN MỀM", color: "#059669", shadow: "rgba(5,150,105,0.45)" },
  { href: "/quang-cao",      label: "QUẢNG CÁO ADS",  color: "#0891b2", shadow: "rgba(8,145,178,0.45)"  },
  { href: "/NetWorks",       label: "NETWORKS (ADB)",  color: "#dc2626", shadow: "rgba(220,38,38,0.45)"  },
  { href: "/gioi-thieu",     label: "GIỚI THIỆU",      color: "#475569", shadow: "rgba(71,85,105,0.45)"  },
];

export const NAV_ICONS: Record<string, { Icon: LucideIcon; bg: string; color: string }> = {
  "/":               { Icon: Home,          bg: "#dbeafe", color: "#2563eb" },
  "/dich-vu":        { Icon: GalleryVerticalEnd, bg: "#ede9fe", color: "#7c3aed" },
  "/khoa-hoc":       { Icon: GraduationCap, bg: "#d1fae5", color: "#059669" },
  "/tut-tricks":     { Icon: Lightbulb,     bg: "#fee2e2", color: "#dc2626" },
  "/tai-nguyen-mmo": { Icon: FolderOpen,    bg: "#fef3c7", color: "#d97706" },
  "/tool-phan-mem":  { Icon: Wrench,        bg: "#d1fae5", color: "#059669" },
  "/quang-cao":      { Icon: Megaphone,     bg: "#e0f2fe", color: "#0891b2" },
  "/NetWorks":       { Icon: Globe,         bg: "#fee2e2", color: "#dc2626" },
  "/gioi-thieu":     { Icon: Info,          bg: "#f1f5f9", color: "#475569" },
};
