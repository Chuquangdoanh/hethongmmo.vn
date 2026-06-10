#!/bin/sh
# =============================================================================
# hethongmmo.vn — Backup Script
# Chạy mỗi 6 giờ trong container backup
#
# Backup gồm:
#   1. Database (pg_dump → gzip)
#   2. Upload files (./uploads → tar.gz)
#   3. SSL certificates (./infra/nginx/ssl → tar.gz)
#
# Lưu tại:
#   - Local:  /backups/{db,uploads,ssl}/   → giữ 3–7 ngày
#   - Offsite: Cloudflare R2               → giữ 30 ngày
#
# Env vars bắt buộc:
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE — Postgres
#   BACKUP_R2_BUCKET                        — tên R2 bucket
#   RCLONE_CONFIG_R2_* (được set từ docker-compose)
# =============================================================================
set -e

log() { echo "[backup] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# ── Cài công cụ một lần khi container khởi động ──────────────────────────────
log "Cài postgresql-client và rclone..."
apk add --no-cache postgresql-client rclone > /dev/null 2>&1
log "Công cụ sẵn sàng."

mkdir -p /backups/db /backups/uploads /backups/ssl

log "Bắt đầu backup loop mỗi 6 giờ..."

while true; do
  STAMP=$(date +%Y%m%d_%H%M%S)
  ERRORS=0

  log "====== Bắt đầu backup: $STAMP ======"

  # ── 1. Database ─────────────────────────────────────────────────────────────
  DB_FILE="/backups/db/db_${STAMP}.sql.gz"
  log "Đang dump database → $DB_FILE"
  if pg_dump | gzip > "$DB_FILE"; then
    SIZE=$(du -sh "$DB_FILE" | cut -f1)
    log "Database OK: $SIZE"
  else
    log "ERROR: Database dump thất bại!"
    ERRORS=$((ERRORS + 1))
    rm -f "$DB_FILE"
  fi

  # ── 2. Uploads ──────────────────────────────────────────────────────────────
  UPLOAD_FILE="/backups/uploads/uploads_${STAMP}.tar.gz"
  log "Đang archive uploads → $UPLOAD_FILE"
  if [ -d /uploads ] && [ "$(ls -A /uploads 2>/dev/null)" ]; then
    if tar -czf "$UPLOAD_FILE" -C /uploads . 2>/dev/null; then
      SIZE=$(du -sh "$UPLOAD_FILE" | cut -f1)
      log "Uploads OK: $SIZE"
    else
      log "ERROR: Archive uploads thất bại!"
      ERRORS=$((ERRORS + 1))
      rm -f "$UPLOAD_FILE"
    fi
  else
    log "Uploads trống hoặc chưa mount — bỏ qua."
  fi

  # ── 3. SSL Certificates ─────────────────────────────────────────────────────
  SSL_FILE="/backups/ssl/ssl_${STAMP}.tar.gz"
  log "Đang backup SSL certs → $SSL_FILE"
  if [ -d /ssl ] && [ "$(ls -A /ssl 2>/dev/null)" ]; then
    if tar -czf "$SSL_FILE" -C /ssl . 2>/dev/null; then
      SIZE=$(du -sh "$SSL_FILE" | cut -f1)
      log "SSL OK: $SIZE"
    else
      log "ERROR: Archive SSL thất bại!"
      ERRORS=$((ERRORS + 1))
      rm -f "$SSL_FILE"
    fi
  else
    log "SSL directory trống hoặc chưa mount — bỏ qua."
  fi

  # ── 4. Xóa bản local cũ ─────────────────────────────────────────────────────
  log "Dọn bản local cũ..."
  find /backups/db      -name "db_*.sql.gz"        -mtime +3 -delete 2>/dev/null || true
  find /backups/uploads -name "uploads_*.tar.gz"   -mtime +7 -delete 2>/dev/null || true
  find /backups/ssl     -name "ssl_*.tar.gz"        -mtime +7 -delete 2>/dev/null || true
  log "Dọn local OK."

  # ── 5. Sync lên Cloudflare R2 ────────────────────────────────────────────────
  if [ -n "$BACKUP_R2_BUCKET" ]; then
    log "Sync lên Cloudflare R2: r2:${BACKUP_R2_BUCKET}..."

    SYNC_OK=1

    rclone copy /backups/db      "r2:${BACKUP_R2_BUCKET}/db"      \
      --transfers=2 --stats-one-line --retries=3 2>&1 \
      && log "R2 db/ sync OK" \
      || { log "ERROR: R2 db/ sync thất bại!"; SYNC_OK=0; ERRORS=$((ERRORS + 1)); }

    rclone copy /backups/uploads "r2:${BACKUP_R2_BUCKET}/uploads" \
      --transfers=2 --stats-one-line --retries=3 2>&1 \
      && log "R2 uploads/ sync OK" \
      || { log "ERROR: R2 uploads/ sync thất bại!"; SYNC_OK=0; ERRORS=$((ERRORS + 1)); }

    rclone copy /backups/ssl     "r2:${BACKUP_R2_BUCKET}/ssl"     \
      --transfers=2 --stats-one-line --retries=3 2>&1 \
      && log "R2 ssl/ sync OK" \
      || { log "ERROR: R2 ssl/ sync thất bại!"; SYNC_OK=0; ERRORS=$((ERRORS + 1)); }

    # Xóa file trên R2 cũ hơn 30 ngày
    if [ "$SYNC_OK" = "1" ]; then
      rclone delete "r2:${BACKUP_R2_BUCKET}/db"      --min-age=30d 2>/dev/null || true
      rclone delete "r2:${BACKUP_R2_BUCKET}/uploads" --min-age=30d 2>/dev/null || true
      rclone delete "r2:${BACKUP_R2_BUCKET}/ssl"     --min-age=30d 2>/dev/null || true
      log "R2 cleanup (>30 ngày) OK."
    fi

  else
    log "BACKUP_R2_BUCKET chưa set — bỏ qua offsite sync."
  fi

  # ── 6. Tổng kết ──────────────────────────────────────────────────────────────
  if [ "$ERRORS" = "0" ]; then
    log "====== Hoàn thành: $STAMP — Không có lỗi ✓ ======"
  else
    log "====== Hoàn thành: $STAMP — CÓ ${ERRORS} LỖI ✗ ======"
  fi

  log "Ngủ 6 giờ đến lần backup tiếp theo..."
  sleep 21600
done
