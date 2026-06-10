#!/usr/bin/env bash
# =============================================================================
# restore.sh — Restore từ Cloudflare R2 backup
#
# Tương thích với: infra/backup/backup.sh (docker backup container)
# Sử dụng: BACKUP_R2_* credentials (bucket riêng, KHÔNG phải media bucket)
#
# Cấu trúc backup trên R2:
#   r2:BACKUP_R2_BUCKET/db/db_YYYYMMDD_HHMMSS.sql.gz
#   r2:BACKUP_R2_BUCKET/uploads/uploads_YYYYMMDD_HHMMSS.tar.gz
#   r2:BACKUP_R2_BUCKET/ssl/ssl_YYYYMMDD_HHMMSS.tar.gz
#
# Cách dùng:
#   ./scripts/restore.sh              ← restore bản backup mới nhất
#   ./scripts/restore.sh latest       ← restore bản backup mới nhất
#   ./scripts/restore.sh 20260607_120000  ← restore bản cụ thể
#   ./scripts/restore.sh --list       ← liệt kê 20 bản backup gần nhất
#
# Yêu cầu:
#   - .env với BACKUP_R2_* vars và POSTGRES_* vars
#   - rclone (tự cài nếu chạy trên Alpine, hoặc: https://rclone.org/install/)
#   - docker compose đang chạy (postgres container healthy)
#
# Quy trình disaster recovery khi VPS chết:
#   1. Clone repo + copy .env
#   2. docker compose up -d postgres    ← chờ postgres healthy
#   3. ./scripts/restore.sh             ← restore DB + uploads + SSL
#   4. docker compose up -d             ← start toàn bộ stack
# =============================================================================
set -euo pipefail

log() { echo "[restore] $(date '+%Y-%m-%d %H:%M:%S') $*"; }
err() { log "ERROR: $*" >&2; exit 1; }

# ── Load .env ─────────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
elif [[ -f "../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ../.env
  set +a
fi

# ── Kiểm tra biến môi trường bắt buộc ────────────────────────────────────────
: "${BACKUP_R2_ENDPOINT:?BACKUP_R2_ENDPOINT chưa set — kiểm tra .env}"
: "${BACKUP_R2_ACCESS_KEY_ID:?BACKUP_R2_ACCESS_KEY_ID chưa set — kiểm tra .env}"
: "${BACKUP_R2_SECRET_ACCESS_KEY:?BACKUP_R2_SECRET_ACCESS_KEY chưa set — kiểm tra .env}"
: "${BACKUP_R2_BUCKET:?BACKUP_R2_BUCKET chưa set — kiểm tra .env}"
: "${POSTGRES_USER:?POSTGRES_USER chưa set — kiểm tra .env}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD chưa set — kiểm tra .env}"
: "${POSTGRES_DB:?POSTGRES_DB chưa set — kiểm tra .env}"

# ── Cấu hình rclone từ BACKUP_R2_* vars ──────────────────────────────────────
# Khớp với cấu hình trong docker-compose.yml backup service
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="${BACKUP_R2_ACCESS_KEY_ID}"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${BACKUP_R2_SECRET_ACCESS_KEY}"
export RCLONE_CONFIG_R2_ENDPOINT="${BACKUP_R2_ENDPOINT}"
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true

# ── Kiểm tra/cài rclone ───────────────────────────────────────────────────────
if ! command -v rclone &>/dev/null; then
  if command -v apk &>/dev/null; then
    log "Cài rclone trên Alpine..."
    apk add --no-cache rclone >/dev/null 2>&1
  elif command -v apt-get &>/dev/null; then
    log "Cài rclone trên Debian/Ubuntu..."
    apt-get install -y rclone >/dev/null 2>&1
  else
    err "rclone chưa cài. Hướng dẫn: https://rclone.org/install/"
  fi
fi

TARGET="${1:-latest}"

# ── Chế độ --list: liệt kê bản backup có sẵn ────────────────────────────────
if [[ "${TARGET}" == "--list" ]]; then
  log "Các bản backup trên R2 (mới nhất trước):"
  echo ""
  rclone ls "r2:${BACKUP_R2_BUCKET}/db/" 2>/dev/null \
    | grep -E "db_[0-9]{8}_[0-9]{6}\.sql\.gz$" \
    | awk '{print $2}' \
    | sed 's|db_||; s|\.sql\.gz||' \
    | sort -r \
    | head -20 \
    | while IFS= read -r ts; do
        echo "  • $ts"
      done
  echo ""
  log "Dùng: $0 <timestamp>  để restore bản cụ thể."
  exit 0
fi

# ── Tìm timestamp mới nhất ───────────────────────────────────────────────────
if [[ "${TARGET}" == "latest" ]]; then
  log "Tìm bản backup mới nhất..."
  TARGET="$(
    rclone ls "r2:${BACKUP_R2_BUCKET}/db/" 2>/dev/null \
      | grep -E "db_[0-9]{8}_[0-9]{6}\.sql\.gz$" \
      | awk '{print $2}' \
      | sed 's|db_||; s|\.sql\.gz||' \
      | sort -r \
      | head -1
  )"
  [[ -z "${TARGET}" ]] && err "Không tìm thấy backup nào trên R2: r2:${BACKUP_R2_BUCKET}/db/"
  log "Backup mới nhất: ${TARGET}"
fi

# Kiểm tra format timestamp: YYYYMMDD_HHMMSS
if ! [[ "${TARGET}" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
  err "Timestamp không hợp lệ: '${TARGET}'. Định dạng: YYYYMMDD_HHMMSS (vd: 20260607_120000)"
fi

LOCAL_TMP="/tmp/hethongmmo-restore-${TARGET}"
mkdir -p "${LOCAL_TMP}"

# ── Xác nhận trước khi restore ───────────────────────────────────────────────
echo ""
echo "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "  !  CẢNH BÁO: Restore sẽ XÓA toàn bộ dữ liệu !"
echo "  !  hiện có trong database và uploads.         !"
echo "  !                                             !"
echo "  !  Database:  ${POSTGRES_DB}"
echo "  !  Backup:    ${TARGET}"
echo "  !  Bucket:    ${BACKUP_R2_BUCKET}"
echo "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo ""
read -r -p "Nhập YES để tiếp tục: " confirm
[[ "${confirm}" != "YES" ]] && { log "Đã hủy."; exit 0; }

# ── 1. Download DB dump ───────────────────────────────────────────────────────
DB_R2="r2:${BACKUP_R2_BUCKET}/db/db_${TARGET}.sql.gz"
DB_LOCAL="${LOCAL_TMP}/db_${TARGET}.sql.gz"

log "Đang tải DB dump từ R2..."
rclone copyto "${DB_R2}" "${DB_LOCAL}" \
  || err "Không tải được DB dump: ${DB_R2}"
log "DB dump OK: $(du -sh "${DB_LOCAL}" | cut -f1)"

# ── 2. Restore PostgreSQL ─────────────────────────────────────────────────────
log "Đang restore database (dùng docker compose exec postgres)..."

# Dùng docker compose exec để tránh cần psql cài trên host
if command -v docker &>/dev/null && docker compose ps postgres 2>/dev/null | grep -q "running\|healthy"; then
  gunzip -c "${DB_LOCAL}" | docker compose exec -T postgres psql \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1
else
  # Fallback: psql trực tiếp (cần PGHOST/PGPORT trên host)
  PGHOST="${PGHOST:-127.0.0.1}"
  PGPORT="${PGPORT:-5433}"
  if ! command -v psql &>/dev/null; then
    err "Không có docker compose (postgres container) và không có psql. Hãy chạy: docker compose up -d postgres trước."
  fi
  PGPASSWORD="${POSTGRES_PASSWORD}" gunzip -c "${DB_LOCAL}" | psql \
    -h "${PGHOST}" -p "${PGPORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1
fi

log "Database restored OK."

# ── 3. Download và restore uploads ───────────────────────────────────────────
UPLOAD_R2="r2:${BACKUP_R2_BUCKET}/uploads/uploads_${TARGET}.tar.gz"
UPLOAD_LOCAL="${LOCAL_TMP}/uploads_${TARGET}.tar.gz"
UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"

log "Đang tải uploads từ R2..."
if rclone copyto "${UPLOAD_R2}" "${UPLOAD_LOCAL}" 2>/dev/null; then
  mkdir -p "${UPLOAD_DIR}"
  tar -xzf "${UPLOAD_LOCAL}" -C "${UPLOAD_DIR}"
  log "Uploads restored OK: $(du -sh "${UPLOAD_DIR}" | cut -f1)"
else
  log "WARN: Không tìm thấy uploads backup (${UPLOAD_R2}) — bỏ qua."
fi

# ── 4. Download và restore SSL certs ────────────────────────────────────────
SSL_R2="r2:${BACKUP_R2_BUCKET}/ssl/ssl_${TARGET}.tar.gz"
SSL_LOCAL="${LOCAL_TMP}/ssl_${TARGET}.tar.gz"
SSL_DIR="./infra/nginx/ssl"

log "Đang tải SSL certs từ R2..."
if rclone copyto "${SSL_R2}" "${SSL_LOCAL}" 2>/dev/null; then
  mkdir -p "${SSL_DIR}"
  tar -xzf "${SSL_LOCAL}" -C "${SSL_DIR}"
  log "SSL certs restored OK."
else
  log "WARN: Không tìm thấy SSL backup (${SSL_R2}) — bỏ qua."
fi

# ── 5. Dọn tmp ───────────────────────────────────────────────────────────────
rm -rf "${LOCAL_TMP}"

# ── 6. Tổng kết ──────────────────────────────────────────────────────────────
echo ""
log "====== RESTORE HOÀN TẤT ✓ ======"
echo ""
echo "  Bước tiếp theo — khởi động toàn bộ stack:"
echo "    docker compose up -d"
echo ""
echo "  Hoặc nếu chỉ cần restart web:"
echo "    docker compose restart web"
echo ""
