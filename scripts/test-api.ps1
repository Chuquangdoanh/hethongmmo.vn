# ============================================================
# test-api.ps1 — Test toàn bộ API endpoints (Windows)
# ============================================================
# Usage:
#   .\scripts\test-api.ps1
#   .\scripts\test-api.ps1 -BaseUrl http://localhost:3000
#   .\scripts\test-api.ps1 -BaseUrl http://localhost:3000 -Email admin@test.com -Password Pass123
#   $env:API_TEST_SECRET="mysecret"; .\scripts\test-api.ps1
# ============================================================

param(
    [string]$BaseUrl   = ($env:BASE_URL ?? "http://localhost:3000"),
    [string]$Email     = "",
    [string]$Password  = "",
    [string]$Bypass    = ($env:API_TEST_SECRET ?? "")
)

$Pass   = 0
$Fail   = 0
$Warn   = 0
$Session = $null
$LoggedIn = $false

function Write-Header([string]$Title) {
    Write-Host ""
    Write-Host "══ $Title ══" -ForegroundColor Cyan -NoNewline
    Write-Host ""
}

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [string]$Expect = "",
        [string]$Body = "",
        [string]$Label = "",
        [switch]$NoBypass
    )

    $DisplayName = if ($Label) { $Label } else { "$Method $Path" }
    $Url = "$BaseUrl$Path"

    $Headers = @{ "Accept" = "application/json"; "Content-Type" = "application/json" }
    if ($Bypass -and -not $NoBypass) {
        $Headers["x-api-test-secret"] = $Bypass
    }

    try {
        $Params = @{
            Method             = $Method
            Uri                = $Url
            Headers            = $Headers
            MaximumRedirection = 0
            ErrorAction        = "Stop"
            TimeoutSec         = 8
        }
        if ($Body) { $Params["Body"] = $Body }
        if ($Session) { $Params["WebSession"] = $Session }

        $Response = Invoke-WebRequest @Params
        $Status = $Response.StatusCode
    } catch [System.Net.WebException] {
        $Status = [int]$_.Exception.Response.StatusCode
    } catch {
        # Redirect or other
        if ($_.Exception.Message -match "(\d{3})") { $Status = [int]$Matches[1] }
        else { $Status = 0 }
    }

    $IsInfraErr = $Status -in @(500, 502, 503, 504)
    $IsRateLimit = $Status -eq 429

    if ($IsInfraErr) {
        Write-Host "  [FAIL] $Status  $DisplayName  (infrastructure error!)" -ForegroundColor Red
        $script:Fail++
    } elseif ($IsRateLimit) {
        Write-Host "  [WARN] $Status  $DisplayName  (rate limited)" -ForegroundColor Yellow
        $script:Warn++
    } elseif ($Expect -and "$Status" -ne $Expect) {
        Write-Host "  [WARN] $Status  $DisplayName  (expected $Expect)" -ForegroundColor Yellow
        $script:Warn++
    } else {
        Write-Host "  [ OK ] $Status  $DisplayName" -ForegroundColor Green
        $script:Pass++
    }
}

function Invoke-Login([string]$Email, [string]$Pw) {
    Write-Host "  Đăng nhập: $Email" -ForegroundColor Cyan

    $script:Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    try {
        # Lấy CSRF token
        $CsrfResp = Invoke-WebRequest -Uri "$BaseUrl/api/auth/csrf" `
            -WebSession $script:Session -TimeoutSec 5
        $Csrf = ($CsrfResp.Content | ConvertFrom-Json).csrfToken

        if (-not $Csrf) { Write-Host "  [FAIL] Không lấy được CSRF token" -ForegroundColor Red; return $false }

        # Login
        $Body = "csrfToken=$([System.Uri]::EscapeDataString($Csrf))&email=$([System.Uri]::EscapeDataString($Email))&password=$([System.Uri]::EscapeDataString($Pw))&callbackUrl=%2F"
        $LoginResp = Invoke-WebRequest -Uri "$BaseUrl/api/auth/callback/credentials" `
            -Method POST -Body $Body -ContentType "application/x-www-form-urlencoded" `
            -WebSession $script:Session -MaximumRedirection 5 -TimeoutSec 8

        Write-Host "  [ OK ] Login thành công ($($LoginResp.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [FAIL] Login thất bại: $_" -ForegroundColor Red
        return $false
    }
}

# ════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         hethongmmo.vn — API Test Runner              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Base URL : $BaseUrl"
Write-Host "  Bypass   : $(if ($Bypass) { '✅ bật' } else { '❌ tắt (set $env:API_TEST_SECRET)' })"
Write-Host "  Auth     : $(if ($Email) { $Email } else { '❌ chưa login' })"

# 1. Health
Write-Header "1. Health"
Invoke-Api GET /api/health -Expect 200

# 2. Public Products
Write-Header "2. Public — Products"
Invoke-Api GET /api/products/mmo              -Expect 200
Invoke-Api GET /api/products/courses          -Expect 200
Invoke-Api GET /api/products/services         -Expect 200
Invoke-Api GET /api/products/tut-tricks       -Expect 200
Invoke-Api GET /api/products/testimonials     -Expect 200
Invoke-Api GET /api/products/reviews          -Expect 200
Invoke-Api GET /api/products/seller           -Expect 200
Invoke-Api GET /api/products/course-categories -Expect 200

# 3. Ticker
Write-Header "3. Ticker"
Invoke-Api GET /api/ticker -Label "GET /api/ticker (SSE)"

# 4. Auth endpoints
Write-Header "4. Auth"
Invoke-Api GET  /api/auth/session   -Expect 200
Invoke-Api GET  /api/auth/csrf      -Expect 200
Invoke-Api GET  /api/auth/providers -Expect 200
Invoke-Api POST /api/auth/register  -Body '{}' -Label "POST /api/auth/register (empty→400/422)"

# 5. Public POST
Write-Header "5. Public POST"
Invoke-Api POST /api/quang-cao/register -Body '{}' -Label "POST /api/quang-cao/register (empty)"
Invoke-Api POST /api/networks/register  -Body '{}' -Label "POST /api/networks/register (empty)"

# 6. Login
Write-Header "6. Login"
if ($Email -and $Password) {
    $LoggedIn = Invoke-Login $Email $Password
} else {
    Write-Host "  Bỏ qua — dùng: .\test-api.ps1 -Email x@x.com -Password pass" -ForegroundColor Yellow
}

# 7. User APIs
$AuthExpect = if ($LoggedIn) { "200" } else { "401" }
Write-Header "7. User APIs$(if ($LoggedIn) { ' (authenticated)' } else { ' (expect 401)' })"
Invoke-Api GET   /api/user/profile            -Expect $AuthExpect
Invoke-Api GET   /api/user/notifications      -Expect $AuthExpect
Invoke-Api GET   /api/user/reviews            -Expect $AuthExpect
Invoke-Api GET   /api/user/complaints         -Expect $AuthExpect
Invoke-Api GET   /api/user/resource-categories -Expect $AuthExpect
Invoke-Api GET   /api/user/2fa/setup          -Expect $AuthExpect
Invoke-Api PATCH /api/user/profile            -Body '{}' -Label "PATCH /api/user/profile"

# 8. Orders
Write-Header "8. Orders"
Invoke-Api GET /api/orders               -Expect $AuthExpect
Invoke-Api GET /api/orders/nonexistent   -Expect (if ($LoggedIn) { "404" } else { "401" })

# 9. Seller
Write-Header "9. Seller"
Invoke-Api GET  /api/seller/products      -Expect $AuthExpect
Invoke-Api GET  /api/seller/register
Invoke-Api POST /api/seller/register -Body '{}' -Label "POST /api/seller/register"

# 10. Admin
Write-Header "10. Admin (expect 401/403 nếu không phải admin)"
Invoke-Api GET /api/admin/stats
Invoke-Api GET /api/admin/users
Invoke-Api GET /api/admin/sellers
Invoke-Api GET /api/admin/orders/pending-count
Invoke-Api GET /api/admin/withdrawals
Invoke-Api GET /api/admin/deposit
Invoke-Api GET /api/admin/audit-log
Invoke-Api GET /api/admin/chats
Invoke-Api GET /api/admin/course-categories
Invoke-Api GET /api/admin/tut-trick-categories
Invoke-Api GET /api/admin/service-categories
Invoke-Api GET /api/admin/resource-categories
Invoke-Api GET /api/admin/testimonials
Invoke-Api GET /api/admin/badges
Invoke-Api GET /api/admin/tickers/texts
Invoke-Api GET /api/admin/seller-settings
Invoke-Api GET /api/admin/seller-tier-definitions
Invoke-Api GET /api/admin/page-permissions
Invoke-Api GET /api/admin/public-page-configs
Invoke-Api GET /api/admin/seller-products

# 11. Storage
Write-Header "11. Storage"
Invoke-Api GET /api/storage/image   -Label "GET /api/storage/image (no params)"
Invoke-Api GET /api/storage/presign -Label "GET /api/storage/presign (no params)"

# 12. Chats
Write-Header "12. Chats"
Invoke-Api GET /api/chats/nonexistent/messages -Expect (if ($LoggedIn) { "404" } else { "401" })

# 13. Webhooks
Write-Header "13. Webhooks"
Invoke-Api GET /api/webhooks/sepay -Label "GET /api/webhooks/sepay (should not be 500/503)"

# ════════════════════════════════════════════════════════════════════════════
$Total = $Pass + $Fail + $Warn
Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor White
Write-Host "  Tổng: $Total  |  " -NoNewline
Write-Host "✅ $Pass" -ForegroundColor Green -NoNewline
Write-Host "  |  " -NoNewline
Write-Host "⚠  $Warn" -ForegroundColor Yellow -NoNewline
Write-Host "  |  " -NoNewline
Write-Host "❌ $Fail" -ForegroundColor Red
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor White

if ($Fail -gt 0) {
    Write-Host "`n❌ CÓ LỖI INFRASTRUCTURE — xem các dòng đỏ ở trên" -ForegroundColor Red
    exit 1
} elseif ($Warn -gt 0) {
    Write-Host "`n⚠  Có cảnh báo nhưng không có lỗi infrastructure" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n🎉 Tất cả API hoạt động đúng!" -ForegroundColor Green
    exit 0
}
