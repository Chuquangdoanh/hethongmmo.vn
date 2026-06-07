"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  color: string;
  shadow: string;
  isFeatured?: boolean;
}

export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  // Defer active-path until after hydration to prevent mismatch
  const [activePath, setActivePath] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActivePath(pathname); }, [pathname]);

  return (
    <nav className="hdr-nav" aria-label="Điều hướng chính">
      <ul className="hdr-nav-list">
        {links.map((link) => {
          const isActive = link.href === "/"
            ? activePath === "/"
            : activePath.startsWith(link.href);

          return (
            <li key={link.href} className="hdr-nav-item">
              {link.isFeatured && (
                <span className="hdr-nav-flame" aria-hidden="true">
                  <Flame size={12} strokeWidth={2} fill="#fb923c" style={{ color: "#f97316" }} />
                </span>
              )}
              <Link
                href={link.href}
                data-href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "hdr-nav-link hdr-active" : "hdr-nav-link"}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
