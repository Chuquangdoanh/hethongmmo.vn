"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserPlus, LogIn } from "lucide-react";

const TABS = [
  { href: "/dang-nhap", label: "Đăng nhập", Icon: LogIn    },
  { href: "/dang-ky",   label: "Đăng ký",   Icon: UserPlus },
] as const;

export default function AuthTabs() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      display: "flex",
      borderBottom: "1px solid #e2e8f0",
      padding: "0 40px",
      borderRadius: "22px 22px 0 0",
      flexShrink: 0,
      background: "#fff",
    }}>
      {TABS.map(({ href, label, Icon }) => {
        const active  = pathname === href;
        const isHover = hovered === href && !active;
        return (
          <Link
            key={href}
            href={href}
            onMouseEnter={() => setHovered(href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "20px 0", marginRight: 32,
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? "#0066ff" : isHover ? "#374151" : "#94a3b8",
              textDecoration: "none",
              borderBottom: active
                ? "2px solid #0066ff"
                : isHover ? "2px solid #cbd5e1" : "2px solid transparent",
              transition: "color .25s ease, border-color .25s ease, transform .2s ease",
              transform: isHover && !active ? "translateY(-1px)" : "translateY(0)",
            }}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
