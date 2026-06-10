import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Rate limiter factory (Edge-compatible) ────────────────────────────────────
//
// Tiers (req/min):
//   auth      → 10  per IP          /api/auth/*
//   sensitive → 5   per userID|IP   withdrawal, change-password, buy-slots
//   chat      → 30  per userID|IP   /api/chats/*
//   storage   → 10  per userID|IP   /api/storage/*, upload endpoints
//   admin     → 300 per userID|IP   /api/admin/*
//   user      → 60  per userID|IP   /api/user/*, /api/seller/*, /api/orders/*
//   public    → 120 per IP          /api/products/*, /api/ticker, public reads
//   fallback  → 100 per IP          everything else
//
// Skipped: /api/health, /api/webhooks/* (has HMAC)
// Fail-open when Upstash is down (Nginx zone=general still guards at IP level).

function makeLimiter(
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: "@mw",
    analytics: false,
  });
}

const L = {
  auth:      makeLimiter(10,  "1 m"),
  sensitive: makeLimiter(5,   "1 m"),
  chat:      makeLimiter(30,  "1 m"),
  storage:   makeLimiter(10,  "1 m"),
  admin:     makeLimiter(300, "1 m"),
  user:      makeLimiter(60,  "1 m"),
  public:    makeLimiter(120, "1 m"),
  fallback:  makeLimiter(100, "1 m"),
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

async function allow(limiter: Ratelimit | null, key: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true; // Upstash unreachable → fail-open
  }
}

function r429(): NextResponse {
  return NextResponse.json(
    { error: "Quá nhiều yêu cầu, vui lòng thử lại sau.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}

// ── Auth/security constants ───────────────────────────────────────────────────

const PROTECTED_PREFIXES = [
  "/thong-tin-ca-nhan",
  "/nap-tien",
  "/don-hang",
  "/lich-su-giao-dich",
  "/tro-chuyen",
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

// Fetch disabled page keys for a role from Upstash REST API (fail-open).
async function fetchDisabledPages(role: string): Promise<string[]> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return [];

  try {
    const key = encodeURIComponent(`page_perm:disabled:${role}`);
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { result: string | null };
    if (!json.result) return [];
    return JSON.parse(json.result) as string[];
  } catch {
    return []; // fail-open: never block access due to Redis being unavailable
  }
}

function isDisabledPage(pathname: string, disabledKeys: string[]): boolean {
  return disabledKeys.some((key) => {
    const urlPath = `/${key}`;
    return pathname === urlPath || pathname.startsWith(`${urlPath}/`);
  });
}

// ── Proxy ─────────────────────────────────────────────────────────────────────

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req: NextRequest & { auth?: { user?: unknown } | null }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: { role?: string; status?: string; id?: string } } | null }).auth;
  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;
  const userStatus = session?.user?.status;
  const uid = session?.user?.id ?? null;

  // ── 1. Rate limiting (API routes only) ────────────────────────────────────
  if (
    pathname.startsWith("/api/") &&
    pathname !== "/api/health" &&
    !pathname.startsWith("/api/webhooks/")
  ) {
    const ip = getIp(req);
    const key = uid ?? ip;

    if (pathname.startsWith("/api/auth/")) {
      if (!(await allow(L.auth, `auth:${ip}`))) return r429();
    } else if (
      pathname === "/api/seller/withdrawal" ||
      pathname === "/api/seller/buy-slots" ||
      pathname.startsWith("/api/user/change-password") ||
      pathname.startsWith("/api/user/2fa/")
    ) {
      if (!(await allow(L.sensitive, `sensitive:${key}`))) return r429();
    } else if (pathname.startsWith("/api/chats/")) {
      if (!(await allow(L.chat, `chat:${key}`))) return r429();
    } else if (
      pathname.startsWith("/api/storage/") ||
      pathname.includes("/upload") ||
      pathname.includes("/secure-image") ||
      pathname.includes("/from-url")
    ) {
      if (!(await allow(L.storage, `storage:${key}`))) return r429();
    } else if (pathname.startsWith("/api/admin/")) {
      if (!(await allow(L.admin, `admin:${key}`))) return r429();
    } else if (
      pathname.startsWith("/api/user/") ||
      pathname.startsWith("/api/seller/") ||
      pathname.startsWith("/api/orders")
    ) {
      if (!(await allow(L.user, `user:${key}`))) return r429();
    } else if (
      pathname.startsWith("/api/products/") ||
      pathname.startsWith("/api/ticker") ||
      pathname.startsWith("/api/tut-tricks") ||
      pathname.startsWith("/api/dich-vu") ||
      pathname.startsWith("/api/courses")
    ) {
      if (!(await allow(L.public, `pub:${ip}`))) return r429();
    } else {
      if (!(await allow(L.fallback, `gen:${ip}`))) return r429();
    }
  }

  // ── 2. Banned users → /tai-khoan-bi-khoa ─────────────────────────────────
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

  // Inject pathname into request headers so Server Components can read it via headers()
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // ── 3. Security headers ───────────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // ── 4. Guard: unauthenticated users ──────────────────────────────────────
  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    SELLER_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (needsAuth && !isAuthenticated) {
    const loginUrl = new URL("/dang-nhap", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Guard: only ADMIN and STAFF can access /admin ─────────────────────
  if (
    pathname.startsWith(ADMIN_PREFIX) &&
    isAuthenticated &&
    userRole !== "ADMIN" &&
    userRole !== "STAFF"
  ) {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 6. Guard: non-seller accessing seller pages ───────────────────────────
  const isSellerRoute = SELLER_PREFIXES.some((p) => pathname.startsWith(p));
  if (isSellerRoute && isAuthenticated && userRole !== "SELLER" && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 7. Redirect authenticated users away from auth pages ─────────────────
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/thong-tin-ca-nhan", req.url));
  }

  // ── 8. CSRF check for API mutations ──────────────────────────────────────
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

  // ── 9. Block /api/webhooks/sepay from non-whitelisted IPs ────────────────
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

  // ── 10. Page permission check (Redis) ────────────────────────────────────
  // ADMIN always has full access. Only check when Redis is configured.
  // Skip the permission management page itself and API routes.
  if (
    isAuthenticated &&
    userRole !== "ADMIN" &&
    !pathname.startsWith("/api/") &&
    pathname !== "/admin/phan-quyen"
  ) {
    const disabledPages = await fetchDisabledPages(userRole ?? "USER");
    if (disabledPages.length > 0 && isDisabledPage(pathname, disabledPages)) {
      const redirectTo = userRole === "STAFF" ? "/admin/dashboard" : "/";
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|images/).*)" ],
};
