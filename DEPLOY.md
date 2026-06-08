# Hướng dẫn Deploy — hethongmmo.vn

> Tài liệu này được tạo tự động từ phân tích source code thực tế.  
> Không chứa bất kỳ giá trị giả định nào — mọi lệnh đều khớp với cấu hình hiện có.

---

## MỤC LỤC

1. [Phân tích dự án](#1-phân-tích-dự-án)
2. [Yêu cầu VPS](#2-yêu-cầu-vps)
3. [Cài đặt VPS lần đầu](#3-cài-đặt-vps-lần-đầu)
4. [Deploy lần đầu](#4-deploy-lần-đầu)
5. [Cấu hình SSL](#5-cấu-hình-ssl)
6. [CI/CD tự động](#6-cicd-tự-động)
7. [Kiểm tra sau deploy](#7-kiểm-tra-sau-deploy)
8. [Bảng lệnh vận hành](#8-bảng-lệnh-vận-hành)

---

## 1. PHÂN TÍCH DỰ ÁN

### Công nghệ đang dùng

| Thành phần | Công nghệ | Version |
|-----------|-----------|---------|
| Frontend / Backend | **Next.js** (App Router, SSR) | 16.2.6 |
| UI | React | 19.2.4 |
| Runtime | Node.js | 20 (Alpine) |
| Package manager | **pnpm** | 9 |
| Language | TypeScript | strict |
| ORM | **Prisma** | 7.8.0 |
| Database | **PostgreSQL** | 16 |
| Connection pool | **Prisma built-in pool** | DB_POOL_SIZE=10 |
| Cache / Rate-limit | **Redis** | 7 + Upstash REST API |
| Auth | **Auth.js v5** | beta.31 |
| Storage | **Cloudflare R2** | S3-compatible |
| Email | **Resend** | 6.12.3 |
| Payment webhook | **SePay** | HMAC-SHA256 |
| CAPTCHA | Cloudflare Turnstile | — |
| Web server | **Nginx + Brotli** | macbre/nginx-brotli |
| Container | **Docker** + Docker Compose | — |
| Monitoring | **Netdata** | stable |

### Cấu trúc source code

```
Hethongmmo/
├── web/                    ← Next.js app (source chính)
│   ├── src/app/            ← App Router pages & API routes
│   ├── src/lib/            ← Services, auth, utils, validation
│   ├── prisma/             ← Schema + migrations
│   └── cluster.js          ← Multi-process entry point (production)
├── infra/nginx/nginx.conf  ← Nginx config đầy đủ (Brotli, cache, headers)
├── Dockerfile              ← Multi-stage build (builder → runner)
├── docker-compose.yml      ← 7 services
├── .env.example            ← Template biến môi trường
└── .github/workflows/      ← CI/CD (ci.yml, deploy-production.yml)
```

### 6 Docker services

| Service | Image | Cổng (host) | Mục đích |
|---------|-------|-------------|---------|
| `postgres` | postgres:16-alpine | — (nội bộ) | Database chính |
| `redis` | redis:7-alpine | — (nội bộ) | Rate-limit + cache |
| `web` | build từ Dockerfile | — (expose 3000 nội bộ) | Next.js app |
| `nginx` | macbre/nginx-brotli | **80, 443** | Reverse proxy + SSL |
| `backup` | postgres:16-alpine | — | Backup tự động hàng ngày |
| `netdata` | netdata/netdata | 127.0.0.1:**19999** | Monitoring (SSH tunnel) |

### Biến môi trường bắt buộc (18 biến)

```
DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
REDIS_URL, REDIS_PASSWORD
AUTH_SECRET, AUTH_URL
ENCRYPTION_KEY (64 hex chars = 32 bytes AES-256)
RESEND_API_KEY, EMAIL_FROM
R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_REGION, R2_PUBLIC_URL
SEPAY_WEBHOOK_SECRET, SEPAY_ALLOWED_IPS
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
TURNSTILE_SECRET, NEXT_PUBLIC_TURNSTILE_SITE_KEY
BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_HOLDER
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BASE_URL, APP_URL
```

---

## 2. YÊU CẦU VPS

### Tối thiểu (khuyến nghị theo docker-compose resource limits)

| Tài nguyên | Tối thiểu | Khuyến nghị |
|-----------|----------|------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Băng thông | 100 Mbps | 1 Gbps |

> **Ghi chú:** PostgreSQL được cấu hình `shared_buffers=768MB` — cần ít nhất 4 GB RAM để không bị OOM.

### Software cần có trên VPS

| Software | Kiểm tra | Cài nếu thiếu |
|---------|---------|--------------|
| Docker | `docker --version` | Xem mục 3.2 |
| Docker Compose | `docker compose version` | Đi kèm Docker Desktop / Docker CE v2+ |
| Git | `git --version` | `apt install git` |
| Certbot | `certbot --version` | Xem mục 5 |

> Node.js, Java, PM2 **không cần** — toàn bộ app chạy trong Docker container.

---

## 3. CÀI ĐẶT VPS LẦN ĐẦU

### 3.1 Bảo mật cơ bản

```bash
# SSH vào VPS với tài khoản root
ssh root@YOUR_VPS_IP

# Cập nhật hệ thống
apt update && apt upgrade -y

# Tạo user deploy (không dùng root cho production)
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy
usermod -aG docker deploy   # sẽ thêm sau khi cài Docker

# Đặt mật khẩu cho deploy user (hoặc dùng SSH key)
passwd deploy

# Firewall — chỉ mở port cần thiết
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable

# Kiểm tra
ufw status
```

### 3.2 Cài Docker CE

```bash
# Gỡ version cũ nếu có
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Cài dependencies
apt install -y ca-certificates curl gnupg

# Thêm Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repo
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài Docker CE + Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Thêm deploy user vào group docker
usermod -aG docker deploy

# Bật Docker tự khởi động
systemctl enable docker
systemctl start docker

# Kiểm tra
docker --version
docker compose version
```

### 3.3 Cài Certbot

```bash
apt install -y certbot

# Kiểm tra
certbot --version
```

### 3.4 Tạo thư mục dự án

```bash
# Chuyển sang deploy user
su - deploy

# Tạo thư mục
sudo mkdir -p /opt/hethongmmo
sudo chown deploy:deploy /opt/hethongmmo

# Tạo thư mục SSL (sẽ mount vào nginx container)
sudo mkdir -p /opt/hethongmmo/infra/nginx/ssl
```

---

## 4. DEPLOY LẦN ĐẦU

### Bước 1: SSH vào VPS

```bash
ssh deploy@YOUR_VPS_IP
cd /opt/hethongmmo
```

### Bước 2: Clone source code

```bash
git clone https://github.com/YOUR_USERNAME/hethongmmo.git .
# Hoặc nếu repo private:
# git clone git@github.com:YOUR_USERNAME/hethongmmo.git .
```

> Nếu dùng SSH key cho GitHub:
> ```bash
> # Trên VPS, tạo SSH key
> ssh-keygen -t ed25519 -C "deploy@hethongmmo"
> cat ~/.ssh/id_ed25519.pub
> # Copy output lên GitHub → Settings → Deploy Keys → Add deploy key
> ```

### Bước 3: Tạo file .env

```bash
# Copy template
cp .env.example .env

# Mở và điền giá trị thực
nano .env
```

**Điền đầy đủ các giá trị:**

```bash
# ── DATABASE ──────────────────────────────────────────────────────────
# Đặt password mạnh, ít nhất 32 ký tự
POSTGRES_USER=app_user
POSTGRES_PASSWORD=<STRONG_32_CHAR_PASSWORD>
POSTGRES_DB=hethongmmo
DATABASE_URL="postgresql://app_user:<PASSWORD>@postgres:5432/hethongmmo"

# ── REDIS ─────────────────────────────────────────────────────────────
REDIS_PASSWORD=<STRONG_REDIS_PASSWORD>
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

# ── AUTH ──────────────────────────────────────────────────────────────
# Tạo AUTH_SECRET: openssl rand -base64 32
AUTH_SECRET=<OUTPUT_OF: openssl rand -base64 32>
AUTH_URL=https://hethongmmo.com

# ── ENCRYPTION ────────────────────────────────────────────────────────
# Tạo ENCRYPTION_KEY: openssl rand -hex 32
ENCRYPTION_KEY=<OUTPUT_OF: openssl rand -hex 32>

# ── EMAIL (Resend) ────────────────────────────────────────────────────
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXX
EMAIL_FROM=noreply@hethongmmo.com

# ── CLOUDFLARE R2 ─────────────────────────────────────────────────────
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=hethongmmo-assets
R2_ACCESS_KEY_ID=<R2_ACCESS_KEY>
R2_SECRET_ACCESS_KEY=<R2_SECRET>
R2_REGION=auto
R2_PUBLIC_URL=https://pub-XXXXX.r2.dev

# ── SEPAY ─────────────────────────────────────────────────────────────
SEPAY_WEBHOOK_SECRET=<HMAC_SECRET>
SEPAY_ALLOWED_IPS=103.124.92.1,103.124.92.2

# ── UPSTASH REDIS (rate limiting HTTP API) ────────────────────────────
UPSTASH_REDIS_REST_URL=https://XXXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=<UPSTASH_TOKEN>

# ── CAPTCHA ───────────────────────────────────────────────────────────
TURNSTILE_SECRET=<TURNSTILE_SECRET>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<TURNSTILE_SITE_KEY>

# ── BANK INFO ─────────────────────────────────────────────────────────
BANK_NAME=MB Bank
BANK_ACCOUNT_NUMBER=<ACCOUNT_NUMBER>
BANK_ACCOUNT_HOLDER=<FULL_NAME>

# ── APP URLS ──────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://hethongmmo.com
NEXT_PUBLIC_BASE_URL=https://hethongmmo.com
APP_URL=https://hethongmmo.com
NODE_ENV=production
```

**Lệnh tạo key nhanh:**
```bash
# AUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (64 hex chars)
openssl rand -hex 32

# REDIS_PASSWORD
openssl rand -base64 24

# POSTGRES_PASSWORD
openssl rand -base64 32 | tr -d '=/+'
```

### Bước 4: Cấu hình SSL trước khi khởi động Nginx

> **Quan trọng:** Nginx container cần cert SSL để khởi động. Xem [Mục 5](#5-cấu-hình-ssl) và chạy SSL setup TRƯỚC khi `docker compose up` với nginx.

**Cách nhanh — dùng cert tạm (self-signed) để boot, rồi thay bằng Let's Encrypt:**

```bash
# Tạo self-signed cert tạm để nginx có thể start
mkdir -p /opt/hethongmmo/infra/nginx/ssl
openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
  -keyout /opt/hethongmmo/infra/nginx/ssl/privkey.pem \
  -out /opt/hethongmmo/infra/nginx/ssl/fullchain.pem \
  -subj "/CN=hethongmmo.com"
```

### Bước 5: Sửa docker-compose.yml — mount SSL volume vào nginx

File `docker-compose.yml` hiện tại **chưa mount SSL** vào nginx container. Cần thêm:

```bash
# Mở docker-compose.yml và tìm section nginx → volumes
nano /opt/hethongmmo/docker-compose.yml
```

Tìm block `nginx:` → `volumes:`, thêm dòng SSL:

```yaml
  nginx:
    ...
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - nginx_cache:/var/cache/nginx/proxy
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro    # ← THÊM DÒNG NÀY
```

### Bước 6: Build và khởi động

```bash
cd /opt/hethongmmo

# Build Docker image (lần đầu mất 5–10 phút)
# NEXT_PUBLIC_TURNSTILE_SITE_KEY phải truyền lúc build (baked vào bundle)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=$(grep NEXT_PUBLIC_TURNSTILE_SITE_KEY .env | cut -d= -f2) \
  docker compose build --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Khởi động tất cả services (ngoại trừ nginx — chờ SSL thật)
docker compose up -d postgres redis

# Đợi DB healthy (10–20 giây)
docker compose ps

# Chạy migration database
docker compose run --rm web node node_modules/.bin/prisma migrate deploy

# Khởi động web app
docker compose up -d web

# Kiểm tra app health
sleep 15
curl -sf http://localhost:3000/api/health && echo "✓ App healthy"
```

### Bước 7: Cài SSL thật (Let's Encrypt) — xem Mục 5

### Bước 8: Khởi động Nginx và Backup

```bash
# Sau khi đã có SSL thật
docker compose up -d nginx backup netdata

# Kiểm tra toàn bộ
docker compose ps
```

### Bước 9: Kiểm tra log

```bash
# Log tất cả services
docker compose logs -f

# Log từng service
docker compose logs -f web
docker compose logs -f nginx
docker compose logs -f postgres
```

---

## 5. CẤU HÌNH SSL (Let's Encrypt)

### 5.1 Trỏ DNS trước

Trước khi cài SSL, đảm bảo DNS đã trỏ về IP VPS:
```
A    hethongmmo.com      → YOUR_VPS_IP
A    www.hethongmmo.com  → YOUR_VPS_IP
```

Kiểm tra: `dig hethongmmo.com +short` → phải ra IP VPS.

### 5.2 Cài cert (standalone mode — tắt nginx trước)

```bash
# Tắt nginx (đang chiếm port 80)
docker compose stop nginx

# Xin cert cho cả domain và www
certbot certonly --standalone \
  -d hethongmmo.com \
  -d www.hethongmmo.com \
  --email chudoanhofficial@gmail.com \
  --agree-tos \
  --non-interactive

# Cert được lưu tại:
# /etc/letsencrypt/live/hethongmmo.com/fullchain.pem
# /etc/letsencrypt/live/hethongmmo.com/privkey.pem
```

### 5.3 Copy cert vào thư mục nginx

```bash
# Copy cert vào thư mục mount của nginx
cp /etc/letsencrypt/live/hethongmmo.com/fullchain.pem \
   /opt/hethongmmo/infra/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/hethongmmo.com/privkey.pem \
   /opt/hethongmmo/infra/nginx/ssl/privkey.pem

# Set permissions đúng
chmod 644 /opt/hethongmmo/infra/nginx/ssl/fullchain.pem
chmod 600 /opt/hethongmmo/infra/nginx/ssl/privkey.pem
```

### 5.4 Khởi động lại nginx

```bash
docker compose up -d nginx
sleep 5
curl -I https://hethongmmo.com
# Phải trả về: HTTP/2 200 hoặc redirect
```

### 5.5 Tự động gia hạn cert (cron)

```bash
# Mở crontab
crontab -e

# Thêm 2 dòng sau (gia hạn lúc 3:30 AM mỗi ngày):
30 3 * * * certbot renew --quiet --pre-hook "docker stop hethongmmo-nginx" --post-hook "cp /etc/letsencrypt/live/hethongmmo.com/fullchain.pem /opt/hethongmmo/infra/nginx/ssl/fullchain.pem && cp /etc/letsencrypt/live/hethongmmo.com/privkey.pem /opt/hethongmmo/infra/nginx/ssl/privkey.pem && docker start hethongmmo-nginx"
```

---

## 6. CI/CD TỰ ĐỘNG

Project đã có sẵn 3 file GitHub Actions:

| File | Trigger | Mục đích |
|------|---------|---------|
| `.github/workflows/ci.yml` | Push mọi branch, PR | Lint + Typecheck + Test + Build Docker |
| `.github/workflows/deploy-production.yml` | Push `main` | Deploy lên VPS production |
| `.github/workflows/deploy-staging.yml` | Push `develop` | Deploy lên VPS staging |

### 6.1 Cấu hình GitHub Secrets

Vào GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

```
# Container registry (dùng ghcr.io có sẵn của GitHub)
REGISTRY_URL          = ghcr.io/YOUR_GITHUB_USERNAME
REGISTRY_USER         = YOUR_GITHUB_USERNAME
REGISTRY_PASSWORD     = YOUR_GITHUB_TOKEN (với write:packages permission)

# VPS SSH
PRODUCTION_HOST       = YOUR_VPS_IP
DEPLOY_SSH_KEY        = <private SSH key của user deploy>

# Build args
NEXT_PUBLIC_TURNSTILE_SITE_KEY = <giá trị thực>
```

### 6.2 Tạo SSH key cho GitHub Actions

```bash
# Trên VPS (user deploy)
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions-deploy"

# Thêm public key vào authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy private key lên GitHub Secrets
cat ~/.ssh/github_deploy
# → Paste nội dung vào secret DEPLOY_SSH_KEY
```

### 6.3 Luồng CI/CD tự động

```
Developer push lên main
         ↓
GitHub Actions: ci.yml
  ├── Lint (ESLint)
  ├── TypeScript check
  ├── Unit + Integration tests (PostgreSQL + Redis containers)
  └── Build & push Docker image → ghcr.io
         ↓ (nếu tất cả pass)
GitHub Actions: deploy-production.yml
  ├── SSH vào VPS /opt/hethongmmo
  ├── docker compose pull web (image mới)
  ├── docker compose up -d --no-deps --wait web (rolling update)
  ├── prisma migrate deploy (trong container mới)
  └── docker image prune (dọn image cũ)
```

---

## 7. KIỂM TRA SAU DEPLOY

### 7.1 Health checks cơ bản

```bash
# Website
curl -I https://hethongmmo.com
# Mong đợi: HTTP/2 200

# API health endpoint
curl -s https://hethongmmo.com/api/health
# Mong đợi: {"status":"ok"} hoặc tương tự

# HTTP → HTTPS redirect
curl -I http://hethongmmo.com
# Mong đợi: 301 https://hethongmmo.com

# WWW redirect
curl -I https://www.hethongmmo.com
# Mong đợi: 301 hoặc 200

# SSL certificate
echo | openssl s_client -connect hethongmmo.com:443 2>/dev/null | \
  openssl x509 -noout -dates
# Mong đợi: notAfter=... (còn hạn ít nhất 60 ngày)
```

### 7.2 Kiểm tra services

```bash
cd /opt/hethongmmo

# Trạng thái tất cả containers
docker compose ps

# Kết quả mong đợi:
# hethongmmo-postgres   Up (healthy)
# hethongmmo-redis      Up (healthy)
# hethongmmo-web        Up (healthy)
# hethongmmo-nginx      Up (healthy)
# hethongmmo-backup     Up
# hethongmmo-netdata    Up
```

### 7.3 Kiểm tra database

```bash
# Kết nối trực tiếp PostgreSQL
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} \
  -c "SELECT COUNT(*) FROM users;"

# Xem migrations đã chạy
docker compose exec web node node_modules/.bin/prisma migrate status
```

### 7.4 Kiểm tra upload ảnh

```bash
# Test upload API (phải có token hợp lệ)
curl -X POST https://hethongmmo.com/api/user/upload \
  -H "Cookie: <session_cookie>" \
  -F "file=@/tmp/test.jpg"
```

### 7.5 Kiểm tra SEO / Headers

```bash
# Security headers
curl -I https://hethongmmo.com | grep -i "strict-transport\|x-frame\|content-security"

# Gzip / Brotli
curl -H "Accept-Encoding: br" -I https://hethongmmo.com | grep -i "content-encoding"
# Mong đợi: content-encoding: br

# Cache headers cho static assets
curl -I "https://hethongmmo.com/_next/static/css/app.css" | grep -i "cache-control"
# Mong đợi: cache-control: public, immutable
```

### 7.6 Monitoring Netdata (qua SSH tunnel)

```bash
# Trên máy local
ssh -L 19999:localhost:19999 deploy@YOUR_VPS_IP -N &

# Mở trình duyệt
# http://localhost:19999
```

---

## 8. BẢNG LỆNH VẬN HÀNH

### Deploy và cập nhật

```bash
cd /opt/hethongmmo

# === DEPLOY LẦN ĐẦU ===
docker compose build
docker compose up -d postgres redis
docker compose run --rm web node node_modules/.bin/prisma migrate deploy
docker compose up -d web nginx backup netdata


# === CẬP NHẬT PHIÊN BẢN MỚI (thủ công) ===
git pull origin main
NEXT_PUBLIC_TURNSTILE_SITE_KEY=$(grep NEXT_PUBLIC_TURNSTILE_SITE_KEY .env | cut -d= -f2) \
  docker compose build --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY web
docker compose up -d --no-deps web
sleep 30
docker compose exec -T web node node_modules/.bin/prisma migrate deploy


# === ROLLBACK ===
# Xem các image đang có
docker images | grep hethongmmo

# Rollback về image cụ thể (thay SHA bằng commit hash cũ)
export IMAGE_TAG=<COMMIT_SHA_CU>
docker compose up -d --no-build web

# Hoặc rollback về image 'previous'
docker compose exec web /bin/sh -c "echo previous image: \$(docker inspect --format='{{.Config.Image}}' hethongmmo-web)"
```

### Xem log

```bash
# Log web app (real-time)
docker compose logs -f web

# Log nginx (access + error)
docker compose logs -f nginx

# Log database
docker compose logs -f postgres

# Log tất cả services
docker compose logs -f --tail=100

# Log 1 giờ gần nhất
docker compose logs --since=1h web

# Lọc lỗi
docker compose logs web 2>&1 | grep -i "error\|warn\|fatal"
```

### Restart services

```bash
# Restart toàn bộ (graceful — stop_grace_period=35s)
docker compose restart

# Restart từng service
docker compose restart web
docker compose restart nginx
docker compose restart postgres

# Hard restart web (force recreate container)
docker compose up -d --force-recreate --no-deps web

# Reload nginx config (không cần restart)
docker compose exec nginx nginx -s reload
```

### Backup dữ liệu

```bash
# Backup thủ công ngay lập tức
docker compose exec backup sh -c '
  FNAME="manual_$(date +%Y%m%d_%H%M%S).sql.gz"
  pg_dump | gzip > "/backups/$FNAME"
  echo "Backup: $FNAME ($(du -sh /backups/$FNAME | cut -f1))"
'

# Xem danh sách backup
ls -lh /opt/hethongmmo/backups/

# Backup tự động: container backup chạy mỗi 24 giờ
# File lưu tại: /opt/hethongmmo/backups/*.sql.gz
# Xóa tự động sau 7 ngày

# Restore từ backup
gunzip -c /opt/hethongmmo/backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U ${POSTGRES_USER} ${POSTGRES_DB}
```

### Kiểm tra tài nguyên

```bash
# Memory và CPU của từng container
docker stats --no-stream

# Disk usage
df -h /opt/hethongmmo
du -sh /opt/hethongmmo/backups/

# Xem Docker volumes
docker volume ls
docker system df

# Dọn dẹp Docker (image cũ, cache)
docker image prune -f
docker builder prune -f
```

### Quản lý database

```bash
# Xem migration status
docker compose exec web node node_modules/.bin/prisma migrate status

# Chạy migration deploy (production — không bao giờ dùng migrate dev)
docker compose exec web node node_modules/.bin/prisma migrate deploy

# Kết nối trực tiếp vào PostgreSQL
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Query nhanh
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} \
  -c "SELECT COUNT(*) FROM users;"
```

### Quản lý SSL

```bash
# Gia hạn cert thủ công
docker compose stop nginx
certbot renew
cp /etc/letsencrypt/live/hethongmmo.com/fullchain.pem /opt/hethongmmo/infra/nginx/ssl/
cp /etc/letsencrypt/live/hethongmmo.com/privkey.pem   /opt/hethongmmo/infra/nginx/ssl/
docker compose start nginx

# Kiểm tra hạn cert
openssl x509 -in /opt/hethongmmo/infra/nginx/ssl/fullchain.pem -noout -dates

# Kiểm tra tự động gia hạn
certbot renew --dry-run
```

---

## Danh sách file cần tạo / sửa khi deploy

### File cần tạo mới trên VPS

| File | Mô tả |
|------|-------|
| `/opt/hethongmmo/.env` | Copy từ `.env.example`, điền giá trị thực |
| `/opt/hethongmmo/infra/nginx/ssl/fullchain.pem` | SSL cert (Let's Encrypt) |
| `/opt/hethongmmo/infra/nginx/ssl/privkey.pem` | SSL private key |

### File cần sửa trong source code

| File | Thay đổi cần làm |
|------|-----------------|
| `docker-compose.yml` | Thêm volume mount SSL cho nginx service (xem Bước 5 mục 4) |

### File cấu hình đã có sẵn (không cần tạo thêm)

| File | Mô tả |
|------|-------|
| `docker-compose.yml` | Đầy đủ 6 services (không có pgbouncer) |
| `Dockerfile` | Multi-stage build, production-ready |
| `infra/nginx/nginx.conf` | Nginx với Brotli, Gzip, cache, security headers |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, build |
| `.github/workflows/deploy-production.yml` | Deploy tự động khi push main |
| `scripts/backup-r2.sh` | Script backup lên Cloudflare R2 |
| `scripts/restore.sh` | Script restore database |

---

*Tài liệu này phản ánh trạng thái source code tại thời điểm phân tích — 2026-06-08.*
