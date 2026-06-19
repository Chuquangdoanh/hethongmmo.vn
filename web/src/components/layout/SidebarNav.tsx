"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  external?: boolean;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

interface Props {
  homeItem: SidebarNavItem;
  groups: SidebarNavGroup[];
  serviceAccordion?: ReactNode;
}

export default function SidebarNav({ homeItem, groups, serviceAccordion }: Props) {
  const pathname = usePathname();
  // Defer active-path until after hydration để tránh hydration mismatch
  const [activePath, setActivePath] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActivePath(pathname); }, [pathname]);

  function isActive(href: string): boolean {
    const path = href.split("?")[0]!;
    if (path === "/") return activePath === "/";
    return activePath === path || activePath.startsWith(`${path}/`);
  }

  return (
    <>
      <Link
        href={homeItem.href}
        prefetch={false}
        className={`sb-home-link${isActive(homeItem.href) ? " sb-active" : ""}`}
      >
        {homeItem.icon}
        <span className="sb-label">{homeItem.label}</span>
      </Link>

      <div className="sb-groups">
        {serviceAccordion}
        {groups.map((group) => (
          <div key={group.title} className="sb-group">
            <p className="sb-group-title sb-label">{group.title}</p>
            {group.items.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                prefetch={false}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={`sb-link${!item.external && isActive(item.href) ? " sb-active" : ""}`}
              >
                {item.icon && <span className="sb-link-icon">{item.icon}</span>}
                <span className="sb-label sb-link-text">{item.label}</span>
                {!!item.badge && <span className="sb-badge sb-label">{item.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
