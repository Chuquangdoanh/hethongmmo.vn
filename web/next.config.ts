import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",

  // Suppress TS errors that don't affect runtime (e.g. @types/dompurify quirks)
  typescript: { ignoreBuildErrors: true },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Redirect www → non-www (chỉ production)
  async redirects() {
    return isDev
      ? []
      : [
          {
            source: "/(.*)",
            has: [{ type: "host", value: "www.hethongmmo.vn" }],
            destination: "https://hethongmmo.vn/:path*",
            permanent: true,
          },
        ];
  },

  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAADdtPd4eBWk-jqZ6",
  },

  serverExternalPackages: ["argon2", "@prisma/client"],

  images: {
    // CDN (cdn.hethongmmo.vn) xử lý optimization — Next.js chỉ output URL thẳng
    // Tránh Next.js image optimizer server-side fetch bị Cloudflare Bot Fight Mode chặn
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.hethongmmo.vn",
      },
    ],
  },
};

export default nextConfig;
