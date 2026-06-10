#!/usr/bin/env bash
# =============================================================================
# backup-r2.sh — Manual backup PostgreSQL + uploads lên Cloudflare R2
#
# Dùng BACKUP_R2_* credentials (bucket riêng, KHÔNG phải media bucket).
# Cấu trúc khớp với infra/backup/backup.sh để restore.sh dùng được.
#
# Cách chạy thủ công từ host:
#   cd /path/to/hethongmmo
#   ./scripts/backup-r2.sh
#
# Hoặc từ trong backup container:
#   docker compose exec backup sh /scripts/backup-r2.sh
#
# Yêu cầu biến môi trường trong .env:
#   BACKUP_R2_ENDPOINT, BACKUP_R2_ACCESS_KEY_ID, BACKUP_R2_SECRET_ACCESS_KEY
#   BACKUP_R2_BUCKET
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (PGHOST, PGUSER, PGPASSWORD, PGDATABASE)
# =============================================================================
set -euo pipefail

log() { echo "[backup-r2] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

### ── Load .env ──────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Hỗ trợ cả BACKUP_R2_* và PG* naming conventions
PGHOST="${PGHOST:-${POSTGRES_HOST:-postgres}}"
PGUSER="${PGUSER:-${POSTGRES_USER}}"
PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD}}"
PGDATABASE="${PGDATABASE:-${POSTGRES_DB}}"

### ── Kiểm tra biến môi trường bắt buộc ─────────────────────────────────────
: "${BACKUP_R2_ENDPOINT:?BACKUP_R2_ENDPOINT chưa set}"
: "${BACKUP_R2_ACCESS_KEY_ID:?BACKUP_R2_ACCESS_KEY_ID chưa set}"
: "${BACKUP_R2_SECRET_ACCESS_KEY:?BACKUP_R2_SECRET_ACCESS_KEY chưa set}"
: "${BACKUP_R2_BUCKET:?BACKUP_R2_BUCKET chưa set}"
: "${PGHOST:?PGHOST chưa set}"
: "${PGUSER:?PGUSER chưa set}"
: "${PGPASSWORD:?PGPASSWORD chưa set}"
: "${PGDATABASE:?PGDATABASE chưa set}"

### ── Config ─────────────────────────────────────────────────────────────────
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
LOCAL_TMP="/tmp/hethongmmo-backup-${TIMESTAMP}"
UPLOAD_DIR="${UPLOAD_DIR_HOST:-${UPLOAD_DIR:-/uploads}}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"

mkdir -p "${LOCAL_TMP}"

### ── Cài rclone nếu chưa có ─────────────────────────────────────────────────
if ! command -v rclone &>/dev/null; then
  if command -v apk &>/dev/null; then
    log "Cài rclone (Alpine)..."
    apk add --quiet --no-cache rclone
  elif command -v apt-get &>/dev/null; then
    log "Cài rclone (Debian/Ubuntu)..."
    apt-get install -y rclone >/dev/null 2>&1
  else
    echo "rclone không có. Cài từ: https://rclone.org/install/"
    exit 1
  fi
fi

### ── Cấu hình rclone từ BACKUP_R2_* vars ────────────────────────────────────
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="${BACKUP_R2_ACCESS_KEY_ID}"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${BACKUP_R2_SECRET_ACCESS_KEY}"
export RCLONE_CONFIG_R2_ENDPOINT="${BACKUP_R2_ENDPOINT}"
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true

### ── 1. Dump PostgreSQL ──────────────────────────────────────────────────────
log "Đang dump database ${PGDATABASE}..."
DB_FILE="${LOCAL_TMP}/db_${TIMESTAMP}.sql.gz"
PGPASSWORD="${PGPASSWORD}" pg_dump \
  -h "${PGHOST}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --no-password \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  | gzip -9 > "${DB_FILE}"
log "DB dump OK: $(du -sh "${DB_FILE}" | cut -f1)"

### ── 2. Archive uploads ─────────────────────────────────────────────────────
UPLOAD_FILE=""
if [[ -d "${UPLOAD_DIR}" ]] && [[ -n "$(ls -A "${UPLOAD_DIR}" 2>/dev/null)" ]]; then
  UPLOAD_FILE="${LOCAL_TMP}/uploads_${TIMESTAMP}.tar.gz"
  log "Đang archive uploads từ ${UPLOAD_DIR}..."
  tar -czf "${UPLOAD_FILE}" -C "${UPLOAD_DIR}" .
  log "Uploads archive OK: $(du -sh "${UPLOAD_FILE}" | cut -f1)"
else
  log "Uploads trống hoặc chưa mount — bỏ qua."
fi

### ── 3. Upload lên R2 ───────────────────────────────────────────────────────
# Cấu trúc: r2:BUCKET/db/db_TIMESTAMP.sql.gz  (khớp với infra/backup/backup.sh)
log "Upload lên R2: r2:${BACKUP_R2_BUCKET}/"

rclone copyto "${DB_FILE}" "r2:${BACKUP_R2_BUCKET}/db/db_${TIMESTAMP}.sql.gz" \
  --transfers=2 --retries=3
log "R2 db/ upload OK."

if [[ -n "${UPLOAD_FILE}" ]]; then
  rclone copyto "${UPLOAD_FILE}" "r2:${BACKUP_R2_BUCKET}/uploads/uploads_${TIMESTAMP}.tar.gz" \
    --transfers=2 --retries=3
  log "R2 uploads/ upload OK."
fi

### ── 4. Xóa backup R2 cũ (giữ RETAIN_DAYS ngày) ──────────────────────────
log "Dọn backup cũ hơn ${RETAIN_DAYS} ngày..."
rclone delete "r2:${BACKUP_R2_BUCKET}/db"      --min-age="${RETAIN_DAYS}d" 2>/dev/null || true
rclone delete "r2:${BACKUP_R2_BUCKET}/uploads" --min-age="${RETAIN_DAYS}d" 2>/dev/null || true
log "Cleanup OK."

### ── 5. Dọn tmp ─────────────────────────────────────────────────────────────
rm -rf "${LOCAL_TMP}"

log "====== Hoàn thành: ${TIMESTAMP} ======"
