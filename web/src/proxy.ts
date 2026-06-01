import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

// Edge-safe auth — verifies JWT using AUTH_SECRET without any DB calls
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/thong-tin-ca-nhan",
  "/nap-tien",
  "/don-hang",
  "/lich-su-giao-dich",
];
const SELLER_PREFIXES = ["/ban-hang", "/san-pham", "/rut-tien"];
const ADMIN_PREFIX = "/admin";
const AUTH_ROUTES = [
  "/dang-nhap",
  "/dang-ky",
  "/verify-otp",
  "/quen-mat-khau",
  "/dat-lai-mat-khau",
];

export default auth(function middleware(req: NextRequest & { auth?: { user?: unknown } | null }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: { role?: string; status?: string } } | null }).auth;
  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;
  const userStatus = session?.user?.status;

  // Banned users → /tai-khoan-bi-khoa
  // Allow /api/auth/* through so signOut can clear the session cookie
  if (userStatus === "BANNED" && pathname !== "/tai-khoan-bi-khoa" && !pathname.startsWith("/api/auth/")) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Tài khoản đã bị khóa", code: "ACCOUNT_BANNED" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    return NextResponse.redirect(new URL("/tai-khoan-bi-khoa", req.url));
  }

  const response = NextResponse.next();

  // ── 1. Security headers ────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // ── 2. Guard: unauthenticated users ────────────────────────────────
  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    SELLER_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (needsAuth && !isAuthenticated) {
    const loginUrl = new URL("/dang-nhap", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Guard: non-admin accessing /admin ───────────────────────────
  if (pathname.startsWith(ADMIN_PREFIX) && isAuthenticated && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 4. Guard: non-seller accessing seller pages ────────────────────
  const isSellerRoute = SELLER_PREFIXES.some((p) => pathname.startsWith(p));
  if (isSellerRoute && isAuthenticated && userRole !== "SELLER" && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 5. Redirect authenticated users away from auth pages ──────────
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 6. CSRF check for API mutations ───────────────────────────────
  if (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    !pathname.startsWith("/api/auth/")
  ) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.endsWith(host)) {
      return new NextResponse("CSRF check failed", { status: 403 });
    }
  }

  // ── 7. Block /api/webhooks/sepay from non-whitelisted IPs ─────────
  if (pathname.startsWith("/api/webhooks/sepay")) {
    const allowedIps = (process.env.SEPAY_ALLOWED_IPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|images/).*)" ],
};
