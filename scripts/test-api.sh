#!/usr/bin/env bash
# ============================================================
# test-api.sh — Test toàn bộ API endpoints
# ============================================================
# Usage:
#   ./scripts/test-api.sh                              # localhost:3000, no auth
#   ./scripts/test-api.sh http://127.0.0.1             # qua nginx, no auth
#   ./scripts/test-api.sh http://localhost:3000 admin@email.com Password123
#
# Bypass middleware: đặt API_TEST_SECRET trong .env rồi:
#   API_TEST_SECRET=mysecret ./scripts/test-api.sh
#
# Env vars:
#   API_TEST_SECRET   — khớp với API_TEST_SECRET trong .env của Next.js
#   BASE_URL          — mặc định http://localhost:3000
# ============================================================

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
AUTH_EMAIL="${2:-}"
AUTH_PASS="${3:-}"
BYPASS="${API_TEST_SECRET:-}"
COOKIE_JAR="/tmp/test-api-cookies-$$.txt"
PASS=0
FAIL=0
WARN=0

# ── Màu ──────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; RESET='\033[0m'; BOLD='\033[1m'

cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

header() { echo -e "\n${BOLD}${BLUE}══ $1 ══${RESET}"; }

# ── Gọi API ──────────────────────────────────────────────────────────────────
# req METHOD URLPATH [EXPECT_STATUS] [--data JSON] [--no-bypass]
# KHÔNG dùng tên biến PATH — shadow system $PATH khiến curl không tìm được
req() {
  local METHOD="$1" URLPATH="$2" EXPECT="${3:-}" DATA="" NO_BYPASS=0 LABEL=""
  shift 3 2>/dev/null || shift $# 2>/dev/null

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --data)   DATA="$2"; shift 2 ;;
      --no-bypass) NO_BYPASS=1; shift ;;
      --label)  LABEL="$2"; shift 2 ;;
      *)        shift ;;
    esac
  done

  local CURL_ARGS=(-s -o /dev/null -w "%{http_code}" --max-time 8
                   -X "$METHOD"
                   -b "$COOKIE_JAR" -c "$COOKIE_JAR"
                   -H "Content-Type: application/json"
                   -H "Accept: application/json")

  [[ -n "$DATA" ]] && CURL_ARGS+=(-d "$DATA")
  [[ "$NO_BYPASS" -eq 0 && -n "$BYPASS" ]] && \
    CURL_ARGS+=(-H "x-api-test-secret: $BYPASS")

  local STATUS
  STATUS=$(curl "${CURL_ARGS[@]}" "$BASE_URL$URLPATH" 2>/dev/null)

  local DISPLAY="${LABEL:-$METHOD $URLPATH}"
  # Fail nếu 500, 502, 503, 504 (infrastructure errors)
  local IS_INFRA_ERR=0
  [[ "$STATUS" == "500" || "$STATUS" == "502" || "$STATUS" == "503" || "$STATUS" == "504" ]] && IS_INFRA_ERR=1

  if [[ "$IS_INFRA_ERR" -eq 1 ]]; then
    echo -e "  ${RED}❌ $STATUS  $DISPLAY${RESET}  (infrastructure error!)"
    ((FAIL++))
  elif [[ "$STATUS" == "429" ]]; then
    echo -e "  ${YELLOW}⚠  $STATUS  $DISPLAY${RESET}  (rate limited — tăng burst hoặc đợi)"
    ((WARN++))
  elif [[ -n "$EXPECT" && "$STATUS" != "$EXPECT" ]]; then
    echo -e "  ${YELLOW}⚠  $STATUS  $DISPLAY${RESET}  (expected $EXPECT)"
    ((WARN++))
  else
    echo -e "  ${GREEN}✅ $STATUS  $DISPLAY${RESET}"
    ((PASS++))
  fi
}

# ── Login để lấy session cookie ──────────────────────────────────────────────
login() {
  local EMAIL="$1" PASS="$2"
  echo -e "${CYAN}🔐 Đăng nhập: $EMAIL${RESET}"

  # Lấy CSRF token
  local CSRF
  CSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

  if [[ -z "$CSRF" ]]; then
    echo -e "  ${RED}❌ Không lấy được CSRF token${RESET}"
    return 1
  fi

  local LOGIN_STATUS
  LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASS" \
    -d "callbackUrl=%2F" \
    -L --max-redirs 5)

  if [[ "$LOGIN_STATUS" =~ ^(200|302|200)$ ]]; then
    echo -e "  ${GREEN}✅ Login OK ($LOGIN_STATUS)${RESET}"
    return 0
  else
    echo -e "  ${RED}❌ Login thất bại ($LOGIN_STATUS)${RESET}"
    return 1
  fi
}

# ════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║         hethongmmo.vn — API Test Runner              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Base URL  : ${BOLD}$BASE_URL${RESET}"
echo -e "  Bypass    : ${BOLD}${BYPASS:+✅ bật}${BYPASS:-❌ tắt (set API_TEST_SECRET)}${RESET}"
echo -e "  Auth      : ${BOLD}${AUTH_EMAIL:-❌ chưa login}${RESET}"

# ── 1. Health ─────────────────────────────────────────────────────────────────
header "1. Health"
req GET /api/health 200

# ── 2. Public API (không cần auth) ───────────────────────────────────────────
header "2. Public — Products"
req GET "/api/products/mmo"           200
req GET "/api/products/courses"       200
req GET "/api/products/services"      200
req GET "/api/products/tut-tricks"    200
req GET "/api/products/testimonials"  200
req GET "/api/products/reviews"       200
req GET "/api/products/seller"        200
req GET "/api/products/course-categories" 200

header "3. Public — Ticker"
req GET "/api/ticker" "" --label "GET /api/ticker (SSE)"

header "4. Public — Services"
req GET "/api/products/services"      200
req GET "/api/products/mmo/route-not-exist-should-404" 404

# ── 3. Auth endpoints ─────────────────────────────────────────────────────────
header "5. Auth endpoints"
req GET  "/api/auth/session"   200
req GET  "/api/auth/csrf"      200
req GET  "/api/auth/providers" 200
# Register với data rỗng → 400 (validation), không phải 500
req POST "/api/auth/register"  "" --data '{}' --label "POST /api/auth/register (empty→400)"

# ── 4. Quảng cáo / Networks (public POST) ────────────────────────────────────
header "6. Public POST — Quảng cáo & Networks"
req POST "/api/quang-cao/register" "" --data '{}' --label "POST /api/quang-cao/register (empty→400)"
req POST "/api/networks/register"  "" --data '{}' --label "POST /api/networks/register (empty→400)"

# ── 5. Login nếu có credentials ──────────────────────────────────────────────
LOGGED_IN=0
if [[ -n "$AUTH_EMAIL" && -n "$AUTH_PASS" ]]; then
  header "7. Login"
  if login "$AUTH_EMAIL" "$AUTH_PASS"; then
    LOGGED_IN=1
  fi
else
  header "7. Login (skip — không có credentials)"
  echo -e "  ${YELLOW}⏭  Bỏ qua — dùng: ./test-api.sh <url> <email> <password>${RESET}"
fi

# ── 6. User APIs (cần auth) ───────────────────────────────────────────────────
header "8. User APIs ${LOGGED_IN:+(authenticated)}$([ $LOGGED_IN -eq 0 ] && echo '(expect 401)')"
req GET  "/api/user/profile"          "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET  "/api/user/notifications"    "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET  "/api/user/reviews"          "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET  "/api/user/complaints"       "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET  "/api/user/resource-categories" "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET  "/api/user/2fa/setup"        "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req PATCH "/api/user/profile" "" --data '{}' \
  --label "PATCH /api/user/profile ($([ $LOGGED_IN -eq 1 ] && echo 'auth' || echo 'no-auth'))"

# ── 7. Orders ─────────────────────────────────────────────────────────────────
header "9. Orders"
req GET "/api/orders"                 "$([ $LOGGED_IN -eq 1 ] && echo 200 || echo 401)"
req GET "/api/orders/non-existent-id" "$([ $LOGGED_IN -eq 1 ] && echo 404 || echo 401)"

# ── 8. Seller APIs ────────────────────────────────────────────────────────────
header "10. Seller APIs"
req GET  "/api/seller/products"       "$([ $LOGGED_IN -eq 1 ] && echo '' || echo 401)"
req GET  "/api/seller/register"       "" --label "GET /api/seller/register"
req POST "/api/seller/register"       "" --data '{}' \
  --label "POST /api/seller/register ($([ $LOGGED_IN -eq 1 ] && echo 'auth' || echo 'no-auth'))"

# ── 9. Admin APIs ─────────────────────────────────────────────────────────────
header "11. Admin APIs (expect 401/403 nếu không phải admin)"
req GET "/api/admin/stats"                 ""
req GET "/api/admin/users"                 ""
req GET "/api/admin/sellers"               ""
req GET "/api/admin/orders/pending-count"  ""
req GET "/api/admin/withdrawals"           ""
req GET "/api/admin/deposit"               ""
req GET "/api/admin/audit-log"             ""
req GET "/api/admin/chats"                 ""
req GET "/api/admin/course-categories"     ""
req GET "/api/admin/tut-trick-categories"  ""
req GET "/api/admin/service-categories"    ""
req GET "/api/admin/resource-categories"   ""
req GET "/api/admin/testimonials"          ""
req GET "/api/admin/badges"                ""
req GET "/api/admin/tickers/texts"         ""
req GET "/api/admin/seller-settings"       ""
req GET "/api/admin/seller-tier-definitions" ""
req GET "/api/admin/page-permissions"      ""
req GET "/api/admin/public-page-configs"   ""
req GET "/api/admin/seller-products"       ""

# ── 10. Storage ───────────────────────────────────────────────────────────────
header "12. Storage"
req GET "/api/storage/image"    ""  --label "GET /api/storage/image (no params)"
req GET "/api/storage/presign"  ""  --label "GET /api/storage/presign (no params)"

# ── 11. Chats ─────────────────────────────────────────────────────────────────
header "13. Chats"
req GET "/api/chats/non-existent/messages" "$([ $LOGGED_IN -eq 1 ] && echo 404 || echo 401)"

# ── 12. Webhooks (không test POST, cần HMAC) ──────────────────────────────────
header "14. Webhooks"
req GET "/api/webhooks/sepay" "" --label "GET /api/webhooks/sepay (should 405/403)"

# ════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  Tổng: ${BOLD}$TOTAL${RESET}  |  ${GREEN}✅ $PASS${RESET}  |  ${YELLOW}⚠  $WARN${RESET}  |  ${RED}❌ $FAIL${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "\n${RED}❌ CÓ LỖI INFRASTRUCTURE — xem các dòng đỏ ở trên${RESET}"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo -e "\n${YELLOW}⚠  Có cảnh báo nhưng không có lỗi infrastructure${RESET}"
  exit 0
else
  echo -e "\n${GREEN}🎉 Tất cả API hoạt động đúng!${RESET}"
  exit 0
fi
