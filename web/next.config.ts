import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",

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
          {
            key: "Content-Security-Policy",
            value: isDev
              ? ""
              : [
                  "default-src 'self'",
                  "script-src 'self' 'nonce-{nonce}'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: https:",
                  "font-src 'self'",
                  "connect-src 'self'",
                  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
                  "frame-ancestors 'none'",
                ].join("; "),
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
            has: [{ type: "host", value: "www.hethongmmo.com" }],
            destination: "https://hethongmmo.com/:path*",
            permanent: true,
          },
        ];
  },

  serverExternalPackages: ["argon2", "@prisma/client"],

  images: {
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
