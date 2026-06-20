# Deploy thủ công lên VPS — thay thế CI/CD khi hết quota
# Chạy từ thư mục gốc: .\scripts\deploy-manual.ps1
#
# Trước khi chạy, đặt các biến môi trường sau (hoặc sửa trực tiếp bên dưới):
#   $env:VPS_HOST       = "IP hoặc domain VPS"
#   $env:SSH_KEY_PATH   = "C:\Users\..\.ssh\deploy_key"   (private key)
#   $env:GHCR_USER      = "chuquangdoanh"
#   $env:GHCR_PAT       = "ghp_xxxxxxxxxxxx"              (GitHub PAT, scope: packages:write)

param(
    [string]$VpsHost   = $env:VPS_HOST,
    [string]$SshKey    = $env:SSH_KEY_PATH,
    [string]$GhcrUser  = $env:GHCR_USER,
    [string]$GhcrPat   = $env:GHCR_PAT,
    [switch]$SkipBuild,       # -SkipBuild: bỏ qua build/push, chỉ deploy trên VPS
    [switch]$SkipMigrator,    # -SkipMigrator: không build migrator (khi Prisma không đổi)
    [string]$TurnstileKey = "0x4AAAAAADdtPd4eBWk-jqZ6"
)

$ErrorActionPreference = "Stop"

# ── Validate ───────────────────────────────────────────────────────────────
if (-not $VpsHost)  { Write-Error "Thiếu VPS_HOST. Set: `$env:VPS_HOST='...'"; exit 1 }
if (-not $SshKey)   { Write-Error "Thiếu SSH_KEY_PATH. Set: `$env:SSH_KEY_PATH='...'"; exit 1 }
if (-not $GhcrUser) { Write-Error "Thiếu GHCR_USER. Set: `$env:GHCR_USER='...'"; exit 1 }
if (-not $GhcrPat)  { Write-Error "Thiếu GHCR_PAT. Set: `$env:GHCR_PAT='...'"; exit 1 }
if (-not (Test-Path $SshKey)) { Write-Error "SSH key không tồn tại: $SshKey"; exit 1 }

$WEB_IMAGE      = "ghcr.io/chuquangdoanh/hethongmmo:latest"
$MIGRATE_IMAGE  = "ghcr.io/chuquangdoanh/hethongmmo-migrate:latest"
$VPS_DIR        = "/opt/hethongmmo"
$VPS_USER       = "deploy"

function Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function OK([string]$msg)   { Write-Host "✅ $msg" -ForegroundColor Green }
function ERR([string]$msg)  { Write-Host "❌ $msg" -ForegroundColor Red }

# ── Bước 1: Login GHCR ────────────────────────────────────────────────────
Step "Login GHCR"
$GhcrPat | docker login ghcr.io -u $GhcrUser --password-stdin
OK "Đã login GHCR"

if (-not $SkipBuild) {
    # ── Bước 2: Build web image ─────────────────────────────────────────────
    Step "Build web image ($WEB_IMAGE)"
    docker build `
        --target runner `
        --tag $WEB_IMAGE `
        --build-arg "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$TurnstileKey" `
        .
    OK "Build web xong"

    # ── Bước 3: Build migrator image ────────────────────────────────────────
    if (-not $SkipMigrator) {
        Step "Build migrator image ($MIGRATE_IMAGE)"
        docker build `
            --target migrator `
            --tag $MIGRATE_IMAGE `
            .
        OK "Build migrator xong"
    }

    # ── Bước 4: Push images ─────────────────────────────────────────────────
    Step "Push web image"
    docker push $WEB_IMAGE
    OK "Push web xong"

    if (-not $SkipMigrator) {
        Step "Push migrator image"
        docker push $MIGRATE_IMAGE
        OK "Push migrator xong"
    }
} else {
    Write-Host "⏭️  -SkipBuild: bỏ qua build/push" -ForegroundColor Yellow
}

# ── Bước 5: Copy docker-compose + infra lên VPS ───────────────────────────
Step "SCP docker-compose.yml + infra/ → VPS"
scp -i $SshKey -r docker-compose.yml infra "${VPS_USER}@${VpsHost}:${VPS_DIR}/"
OK "SCP xong"

# ── Bước 6: SSH deploy ────────────────────────────────────────────────────
Step "SSH deploy trên VPS"

$DEPLOY_CMD = @"
set -e
cd $VPS_DIR

echo '$GhcrPat' | docker login ghcr.io -u '$GhcrUser' --password-stdin

docker system prune -f || true

docker compose pull || (echo 'Pull lần 1 thất bại, thử lại...' && sleep 5 && docker compose pull)
docker compose up -d
docker image prune -f
echo 'Images updated'

echo 'Chờ container healthy...'
ELAPSED=0
until docker inspect --format='{{.State.Health.Status}}' hethongmmo-web 2>/dev/null | grep -q '^healthy$'; do
  if [ "\$ELAPSED" -ge 240 ]; then
    echo 'TIMEOUT: container không healthy sau 240s'
    docker ps -a --filter 'name=hethongmmo' --format 'table {{.Names}}\t{{.Status}}'
    docker logs hethongmmo-web --tail 50
    exit 1
  fi
  sleep 10
  ELAPSED=\$((ELAPSED + 10))
  echo "  ...${ELAPSED}s"
done
echo "Container healthy sau \${ELAPSED}s"

docker compose up -d --force-recreate nginx
echo "Deploy xong: \$(date)"
"@

ssh -i $SshKey -o StrictHostKeyChecking=no "${VPS_USER}@${VpsHost}" $DEPLOY_CMD

OK "Deploy hoàn tất!"
Write-Host ""
Write-Host "Website: https://hethongmmo.vn" -ForegroundColor Green
