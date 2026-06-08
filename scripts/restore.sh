#!/usr/bin/env bash
# restore.sh — Restore từ backup trên Cloudflare R2
#
# Usage:
#   ./scripts/restore.sh <backup-timestamp>
#   ./scripts/restore.sh 20260607_120000
#
# Hoặc restore backup mới nhất:
#   ./scripts/restore.sh latest
#
# Yêu cầu biến môi trường (từ .env):
#   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE

set -euo pipefail

### ── Load .env nếu có ───────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

### ── Kiểm tra biến môi trường bắt buộc ─────────────────────────────────────
: "${R2_ENDPOINT:?R2_ENDPOINT chưa set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID chưa set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY chưa set}"
: "${R2_BUCKET:?R2_BUCKET chưa set}"
: "${PGHOST:?PGHOST chưa set}"
: "${PGUSER:?PGUSER chưa set}"
: "${PGPASSWORD:?PGPASSWORD chưa set}"
: "${PGDATABASE:?PGDATABASE chưa set}"

TARGET="${1:-}"
if [[ -z "${TARGET}" ]]; then
  echo "Usage: $0 <timestamp|latest>"
  echo "  Example: $0 20260607_120000"
  echo "  Example: $0 latest"
  exit 1
fi

export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="auto"
AWS_ARGS="--endpoint-url ${R2_ENDPOINT} --no-progress"

### ── Tìm timestamp nếu chọn latest ─────────────────────────────────────────
if [[ "${TARGET}" == "latest" ]]; then
  echo "[restore] Finding latest backup..."
  TARGET="$(
    aws s3 ls "s3://${R2_BUCKET}/backups/" ${AWS_ARGS} \
      | awk '{print $2}' \
      | sort -r \
      | head -1 \
      | tr -d '/'
  )"
  if [[ -z "${TARGET}" ]]; then
    echo "[restore] ERROR: No backups found in R2."
    exit 1
  fi
  echo "[restore] Latest backup: ${TARGET}"
fi

R2_PREFIX="backups/${TARGET}"
LOCAL_TMP="/tmp/hethongmmo-restore-${TARGET}"
mkdir -p "${LOCAL_TMP}"

### ── Xác nhận trước khi restore ────────────────────────────────────────────
echo ""
echo "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "  !  CẢNH BÁO: Restore sẽ XÓA toàn bộ    !"
echo "  !  dữ liệu hiện có trong DB và uploads  !"
echo "  !  Database: ${PGDATABASE}"
echo "  !  Backup:   ${TARGET}"
echo "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo ""
read -r -p "Nhập YES để tiếp tục: " confirm
if [[ "${confirm}" != "YES" ]]; then
  echo "[restore] Hủy."
  exit 0
fi

### ── 1. Download từ R2 ──────────────────────────────────────────────────────
echo "[restore] Downloading from R2..."
aws s3 cp "s3://${R2_BUCKET}/${R2_PREFIX}/" "${LOCAL_TMP}/" --recursive ${AWS_ARGS}

### ── 2. Restore PostgreSQL ──────────────────────────────────────────────────
DB_FILE="$(ls "${LOCAL_TMP}"/db_*.sql.gz 2>/dev/null | head -1)"
if [[ -z "${DB_FILE}" ]]; then
  echo "[restore] ERROR: Không tìm thấy file DB dump trong backup."
  exit 1
fi

echo "[restore] Restoring DB từ $(basename "${DB_FILE}")..."
gunzip -c "${DB_FILE}" | psql \
  -h "${PGHOST}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --no-password \
  -v ON_ERROR_STOP=1

echo "[restore] DB restore OK."

### ── 3. Restore uploads ─────────────────────────────────────────────────────
UPLOAD_FILE="$(ls "${LOCAL_TMP}"/uploads_*.tar.gz 2>/dev/null | head -1)"
UPLOAD_DIR_HOST="${UPLOAD_DIR_HOST:-./uploads}"

if [[ -n "${UPLOAD_FILE}" ]]; then
  echo "[restore] Restoring uploads từ $(basename "${UPLOAD_FILE}")..."
  mkdir -p "${UPLOAD_DIR_HOST}"
  tar -xzf "${UPLOAD_FILE}" -C "${UPLOAD_DIR_HOST}"
  echo "[restore] Uploads restore OK."
else
  echo "[restore] WARN: Không tìm thấy file uploads trong backup."
fi

### ── 4. Dọn tmp ─────────────────────────────────────────────────────────────
rm -rf "${LOCAL_TMP}"

echo ""
echo "[restore] Hoàn tất! Khởi động lại web service:"
echo "  docker compose restart web"
