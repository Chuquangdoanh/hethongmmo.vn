#!/usr/bin/env bash
# backup-r2.sh — Backup PostgreSQL + uploads lên Cloudflare R2
# Chạy thủ công hoặc qua cron trong Docker backup service
#
# Yêu cầu biến môi trường trong .env:
#   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE
#
# Cách chạy thủ công từ host:
#   docker compose exec backup sh /scripts/backup-r2.sh

set -euo pipefail

### ── Kiểm tra biến môi trường bắt buộc ─────────────────────────────────────
: "${R2_ENDPOINT:?R2_ENDPOINT chưa set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID chưa set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY chưa set}"
: "${R2_BUCKET:?R2_BUCKET chưa set}"
: "${PGHOST:?PGHOST chưa set}"
: "${PGUSER:?PGUSER chưa set}"
: "${PGPASSWORD:?PGPASSWORD chưa set}"
: "${PGDATABASE:?PGDATABASE chưa set}"

### ── Config ─────────────────────────────────────────────────────────────────
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
LOCAL_TMP="/tmp/hethongmmo-backup-${TIMESTAMP}"
UPLOAD_DIR_HOST="${UPLOAD_DIR_HOST:-/uploads}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"

mkdir -p "${LOCAL_TMP}"

### ── Cài aws CLI nếu chưa có (alpine) ──────────────────────────────────────
if ! command -v aws &>/dev/null; then
  echo "[backup] Installing aws-cli..."
  apk add --quiet --no-cache aws-cli 2>/dev/null || pip3 install --quiet awscli 2>/dev/null
fi

export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="auto"

AWS_ARGS="--endpoint-url ${R2_ENDPOINT} --no-progress"

### ── 1. Dump PostgreSQL ──────────────────────────────────────────────────────
echo "[backup] Dumping PostgreSQL ${PGDATABASE}..."
DB_FILE="${LOCAL_TMP}/db_${PGDATABASE}_${TIMESTAMP}.sql.gz"
pg_dump \
  -h "${PGHOST}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --no-password \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  | gzip -9 > "${DB_FILE}"
echo "[backup] DB dump: $(du -sh "${DB_FILE}" | cut -f1)"

### ── 2. Archive uploads ─────────────────────────────────────────────────────
echo "[backup] Archiving uploads..."
UPLOAD_FILE="${LOCAL_TMP}/uploads_${TIMESTAMP}.tar.gz"
tar -czf "${UPLOAD_FILE}" -C "${UPLOAD_DIR_HOST}" . 2>/dev/null || {
  echo "[backup] WARN: uploads dir empty or not mounted, skipping"
  UPLOAD_FILE=""
}

### ── 3. Upload sang R2 ──────────────────────────────────────────────────────
R2_PREFIX="backups/${TIMESTAMP}"

echo "[backup] Uploading to R2 s3://${R2_BUCKET}/${R2_PREFIX}/"
aws s3 cp "${DB_FILE}" "s3://${R2_BUCKET}/${R2_PREFIX}/$(basename "${DB_FILE}")" ${AWS_ARGS}

if [[ -n "${UPLOAD_FILE}" ]]; then
  aws s3 cp "${UPLOAD_FILE}" "s3://${R2_BUCKET}/${R2_PREFIX}/$(basename "${UPLOAD_FILE}")" ${AWS_ARGS}
fi

### ── 4. Xóa backup cũ trên R2 (giữ RETAIN_DAYS ngày) ──────────────────────
echo "[backup] Pruning R2 backups older than ${RETAIN_DAYS} days..."
CUTOFF="$(date -u -d "${RETAIN_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v -"${RETAIN_DAYS}"d +%Y-%m-%dT%H:%M:%SZ)"
aws s3 ls "s3://${R2_BUCKET}/backups/" ${AWS_ARGS} \
  | awk '{print $2}' \
  | while read -r prefix; do
      folder_ts="${prefix%/}"
      # Chuyển folder timestamp YYYYMMDD_HHMMSS → ISO để so sánh
      folder_iso="${folder_ts:0:4}-${folder_ts:4:2}-${folder_ts:6:2}T${folder_ts:9:2}:${folder_ts:11:2}:${folder_ts:13:2}Z"
      if [[ "${folder_iso}" < "${CUTOFF}" ]]; then
        echo "[backup] Deleting old backup: ${prefix}"
        aws s3 rm "s3://${R2_BUCKET}/backups/${prefix}" --recursive ${AWS_ARGS}
      fi
    done

### ── 5. Dọn tmp ─────────────────────────────────────────────────────────────
rm -rf "${LOCAL_TMP}"

echo "[backup] Done — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
