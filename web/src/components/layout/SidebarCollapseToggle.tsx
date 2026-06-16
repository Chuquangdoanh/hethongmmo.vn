"use client";

import { useEffect } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { toggleSidebarCollapse, applyStoredSidebarCollapse } from "./sidebar-collapse";

interface Props {
  className: string;
  /** Hiện trong sidebar footer (icon + label "Thu gọn") khác với nút hamburger trên header */
  variant: "header" | "footer";
}

export default function SidebarCollapseToggle({ className, variant }: Props) {
  useEffect(() => { applyStoredSidebarCollapse(); }, []);

  if (variant === "footer") {
    return (
      <button type="button" className={className} onClick={toggleSidebarCollapse}>
        <PanelLeftClose size={16} strokeWidth={2} />
        <span className="sb-label">Thu gọn</span>
      </button>
    );
  }

  return (
    <button type="button" className={className} onClick={toggleSidebarCollapse} aria-label="Thu gọn / mở rộng menu">
      <Menu size={18} strokeWidth={2} />
    </button>
  );
}
