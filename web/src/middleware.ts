import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { trackRateHit } from "@/lib/security/rate-alert";

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
// Skipped: /api/health, /api/webhooks/* (has Apikey auth)
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
  image:     makeLimiter(200, "1 m"), // public image proxy — browser-cached 1yr, needs burst headroom
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

// 800 ms timeout: if Upstash is slow, fail-open immediately instead of holding
// the request for 3s and causing connection exhaustion → 503 cascade.
async function allow(limiter: Ratelimit | null, key: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    const { success } = await Promise.race([
      limiter.limit(key),
      new Promise<{ success: boolean }>((resolve) =>
        setTimeout(() => resolve({ success: true }), 800),
      ),
    ]);
    return success;
  } catch {
    return true; // Upstash unreachable → fail-open
  }
}

// Wrapper: check rate limit + fire-and-forget alert khi bị block
async function checkAndAllow(
  limiter: Ratelimit | null,
  key: string,
  tier: string,
  pathname: string,
): Promise<boolean> {
  const ok = await allow(limiter, key);
  if (!ok) trackRateHit(tier, key, pathname);
  return ok;
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

// ── Page permission cache ─────────────────────────────────────────────────────
// Two-layer defence against thundering herd (10+ concurrent RSC prefetches):
//   1. TTL cache (30s): subsequent requests within window skip Upstash entirely
//   2. In-flight dedup: concurrent cache misses share one Upstash call instead
//      of each making their own → eliminates the burst of parallel requests
const _dpCache   = new Map<string, { pages: string[]; exp: number }>();
const _dpInflight = new Map<string, Promise<string[]>>();

async function fetchDisabledPages(role: string): Promise<string[]> {
  const now = Date.now();
  const hit = _dpCache.get(role);
  if (hit && hit.exp > now) return hit.pages;

  // Deduplicate: if another request is already fetching for this role, wait for it
  const pending = _dpInflight.get(role);
  if (pending) return pending;

  const promise = (async (): Promise<string[]> => {
    try {
      const url   = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return [];

      const key = encodeURIComponent(`page_perm:disabled:${role}`);
      const res = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal:  AbortSignal.timeout(2000), // reduced from 3s → 2s
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { result: string | null };
      const pages = json.result ? (JSON.parse(json.result) as string[]) : [];
      _dpCache.set(role, { pages, exp: Date.now() + 30_000 });
      return pages;
    } catch {
      return [];
    } finally {
      _dpInflight.delete(role);
    }
  })();

  _dpInflight.set(role, promise);
  return promise;
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

  // ── 0. Test bypass ────────────────────────────────────────────────────────
  const testSecret = process.env.API_TEST_SECRET;
  if (testSecret && req.headers.get("x-api-test-secret") === testSecret) {
    const h = new Headers(req.headers);
    h.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: h } });
  }

  const session = (req as { auth?: { user?: { role?: string; status?: string; id?: string } } | null }).auth;
  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;
  const userStatus = session?.user?.status;
  const uid = session?.user?.id ?? null;

  // RSC prefetch requests: Next.js fires these speculatively for links on the page.
  // Skip heavy Upstash calls for prefetches — the actual navigation will be guarded.
  const isRscPrefetch =
    req.nextUrl.searchParams.has("_rsc") ||
    req.headers.get("Next-Router-Prefetch") === "1";

  // ── 1. Rate limiting (API routes only) ────────────────────────────────────
  if (
    !isRscPrefetch &&
    pathname.startsWith("/api/") &&
    pathname !== "/api/health" &&
    !pathname.startsWith("/api/webhooks/")
  ) {
    const ip = getIp(req);
    const key = uid ?? ip;

    // Auth.js gọi session/csrf/providers/error trên mọi page load → không rate-limit
    const isAuthReadOnly =
      pathname === "/api/auth/session" ||
      pathname === "/api/auth/csrf" ||
      pathname === "/api/auth/providers" ||
      pathname === "/api/auth/error";

    if (pathname.startsWith("/api/auth/") && !isAuthReadOnly) {
      if (!(await checkAndAllow(L.auth, `auth:${ip}`, "auth", pathname))) return r429();
    } else if (
      pathname === "/api/seller/withdrawal" ||
      pathname === "/api/seller/buy-slots" ||
      pathname.startsWith("/api/user/change-password") ||
      pathname.startsWith("/api/user/2fa/")
    ) {
      if (!(await checkAndAllow(L.sensitive, `sensitive:${key}`, "sensitive", pathname))) return r429();
    } else if (pathname.startsWith("/api/chats/")) {
      if (!(await checkAndAllow(L.chat, `chat:${key}`, "chat", pathname))) return r429();
    } else if (pathname === "/api/storage/image") {
      // Public image proxy: browser caches with 1yr max-age; allow burst for first page load
      if (!(await checkAndAllow(L.image, `img:${ip}`, "image", pathname))) return r429();
    } else if (
      pathname.startsWith("/api/storage/") ||
      pathname.includes("/upload") ||
      pathname.includes("/secure-image") ||
      pathname.includes("/from-url")
    ) {
      if (!(await checkAndAllow(L.storage, `storage:${key}`, "storage", pathname))) return r429();
    } else if (pathname.startsWith("/api/admin/")) {
      if (!(await checkAndAllow(L.admin, `admin:${key}`, "admin", pathname))) return r429();
    } else if (
      pathname.startsWith("/api/user/") ||
      pathname.startsWith("/api/seller/") ||
      pathname.startsWith("/api/orders")
    ) {
      if (!(await checkAndAllow(L.user, `user:${key}`, "user", pathname))) return r429();
    } else if (
      pathname.startsWith("/api/products/") ||
      pathname.startsWith("/api/ticker") ||
      pathname.startsWith("/api/tut-tricks") ||
      pathname.startsWith("/api/dich-vu") ||
      pathname.startsWith("/api/courses")
    ) {
      if (!(await checkAndAllow(L.public, `pub:${ip}`, "public", pathname))) return r429();
    } else if (!isAuthReadOnly) {
      if (!(await checkAndAllow(L.fallback, `gen:${ip}`, "fallback", pathname))) return r429();
    }
  }

  // ── 2. Banned users → /tai-khoan-bi-khoa ─────────────────────────────────
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
  // CSP được set bởi nginx (infra/nginx/nginx.conf) — không set ở đây để tránh duplicate

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

  // ── 8. Page permission check (Redis) ─────────────────────────────────────
  // Skip for RSC prefetch (speculative, guarded on actual navigation),
  // API routes, admin (always full access), and the permission page itself.
  if (
    !isRscPrefetch &&
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
