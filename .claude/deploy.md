# Hướng dẫn đẩy project lên VPS mới

## Yêu cầu VPS tối thiểu
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4 GB (PostgreSQL ~1 GB, Next.js ~1.3 GB, Redis ~256 MB)
- **CPU**: 2 vCPU
- **Disk**: 20 GB SSD
- **IP tĩnh** (khai báo trong Cloudflare)

---

## BƯỚC 1 — Chuẩn bị VPS (SSH vào với quyền root)

```bash
# Cập nhật hệ thống
apt update && apt upgrade -y

# Tạo user deploy
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
# usermod -aG docker deploy  ← thêm sau khi cài Docker ở bước 2

# Cấu hình SSH key — chạy từ máy local
ssh-keygen -t ed25519 -C "deploy@hethongmmo" -f ~/.ssh/hethongmmo_deploy
ssh-copy-id -i ~/.ssh/hethongmmo_deploy.pub root@<VPS_IP>

# Trên VPS: copy key cho user deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Hardening SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## BƯỚC 2 — Cài Docker và Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# Kiểm tra
docker --version       # cần Docker 24+
docker compose version # cần Compose v2+
```

---

## BƯỚC 3 — Tạo cấu trúc thư mục trên VPS

```bash
su - deploy

mkdir -p /opt/hethongmmo/infra/nginx/ssl
mkdir -p /opt/hethongmmo/infra/backup
mkdir -p /opt/hethongmmo/uploads
mkdir -p /opt/hethongmmo/backups

chown -R deploy:deploy /opt/hethongmmo
```

---

## BƯỚC 4 — Cấu hình SSL Certificate

### Cách 1: Let's Encrypt (khuyên dùng khi không qua Cloudflare proxy)

```bash
apt install -y certbot

certbot certonly --standalone -d hethongmmo.com -d www.hethongmmo.com \
  --email chudoanhofficial@gmail.com --agree-tos --no-eff-email

cp /etc/letsencrypt/live/hethongmmo.com/fullchain.pem /opt/hethongmmo/infra/nginx/ssl/
cp /etc/letsencrypt/live/hethongmmo.com/privkey.pem /opt/hethongmmo/infra/nginx/ssl/

# Tự động renew
(crontab -l 2>/dev/null; echo "0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/hethongmmo.com/*.pem /opt/hethongmmo/infra/nginx/ssl/ && docker exec hethongmmo-nginx nginx -s reload") | crontab -
```

### Cách 2: Cloudflare Origin Certificate (khuyên dùng khi traffic qua Cloudflare proxy)

```
Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
Chọn: PEM format, 15 years, wildcard *.hethongmmo.com + hethongmmo.com
```

```bash
nano /opt/hethongmmo/infra/nginx/ssl/fullchain.pem   # paste Origin Certificate
nano /opt/hethongmmo/infra/nginx/ssl/privkey.pem     # paste Private Key
chmod 600 /opt/hethongmmo/infra/nginx/ssl/*.pem
```

---

## BƯỚC 5 — Tạo file .env trên VPS

```bash
nano /opt/hethongmmo/.env
```

```bash
# DATABASE
POSTGRES_USER=app_user
POSTGRES_PASSWORD=<mật_khẩu_mạnh_32_ký_tự>
POSTGRES_DB=hethongmmo
DATABASE_URL=postgresql://app_user:<POSTGRES_PASSWORD>@postgres:5432/hethongmmo

# REDIS
REDIS_PASSWORD=<mật_khẩu_redis>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# AUTH
AUTH_SECRET=<random_32_bytes>    # openssl rand -base64 32
AUTH_URL=https://hethongmmo.com

# ENCRYPTION (AES-256-GCM)
ENCRYPTION_KEY=<64_hex_chars>    # openssl rand -hex 32

# EMAIL
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@hethongmmo.com

# CLOUDFLARE R2 (media storage)
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET=hethongmmo-assets
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_REGION=auto
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# CLOUDFLARE R2 (backup — bucket riêng)
BACKUP_R2_BUCKET=hethongmmo-backups
BACKUP_R2_ACCESS_KEY_ID=xxxx
BACKUP_R2_SECRET_ACCESS_KEY=xxxx
BACKUP_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# SEPAY
SEPAY_WEBHOOK_SECRET=<64_hex_chars>    # openssl rand -hex 32
SEPAY_ALLOWED_IPS=103.124.92.1,103.124.92.2

# UPSTASH REDIS (rate limiting)
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx

# TURNSTILE
TURNSTILE_SECRET=xxxx
NEXT_PUBLIC_TURNSTILE_SITE_KEY=xxxx

# BANK INFO
BANK_NAME=MB Bank
BANK_ACCOUNT_NUMBER=xxxx
BANK_ACCOUNT_HOLDER=NGUYEN VAN A

# APP
NEXT_PUBLIC_APP_URL=https://hethongmmo.com
NEXT_PUBLIC_BASE_URL=https://hethongmmo.com
APP_URL=https://hethongmmo.com
NODE_ENV=production

# DOCKER REGISTRY
REGISTRY_URL=ghcr.io/chuquangdoanh
IMAGE_TAG=latest
```

```bash
chmod 600 /opt/hethongmmo/.env
```

---

## BƯỚC 6 — Copy file cấu hình từ repo lên VPS

Chạy từ máy local (Git Bash hoặc PowerShell):

```bash
cd C:\Hethongmmo
git push origin main

scp -i ~/.ssh/hethongmmo_deploy docker-compose.yml deploy@<VPS_IP>:/opt/hethongmmo/
scp -i ~/.ssh/hethongmmo_deploy -r infra/ deploy@<VPS_IP>:/opt/hethongmmo/
```

---

## BƯỚC 7 — Cấu hình GitHub Actions Secrets

**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Giá trị |
|-------------|---------|
| `PRODUCTION_HOST` | IP hoặc domain của VPS |
| `DEPLOY_SSH_KEY` | Nội dung file `~/.ssh/hethongmmo_deploy` (private key) |
| `REGISTRY_USER` | GitHub username: `chuquangdoanh` |
| `REGISTRY_PASSWORD` | GitHub PAT với quyền `read:packages` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |

---

## BƯỚC 8 — Deploy lần đầu (thủ công trên VPS)

```bash
ssh -i ~/.ssh/hethongmmo_deploy deploy@<VPS_IP>

cd /opt/hethongmmo

# Login GitHub Container Registry
echo "<GITHUB_PAT>" | docker login ghcr.io -u chuquangdoanh --password-stdin

# Pull images và khởi động
docker compose pull
docker compose up -d

# Theo dõi
docker compose logs -f
```

---

## BƯỚC 9 — Kiểm tra sau deploy

```bash
# Trạng thái containers — kết quả mong đợi:
# hethongmmo-pg       Up (healthy)
# hethongmmo-redis    Up (healthy)
# hethongmmo-migrate  Exited (0)   ← chạy 1 lần rồi thoát, BÌNH THƯỜNG
# hethongmmo-web      Up (healthy)
# hethongmmo-nginx    Up (healthy)
# hethongmmo-backup   Up
# hethongmmo-netdata  Up
docker compose ps

# Smoke test
curl -k https://127.0.0.1/api/health
curl -k -o /dev/null -w "%{http_code}" https://127.0.0.1/

# Xem logs nếu có lỗi
docker logs hethongmmo-web --tail 50
docker logs hethongmmo-migrate
```

---

## BƯỚC 10 — Cấu hình Cloudflare DNS

**Cloudflare Dashboard → DNS → Add records:**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `<VPS_IP>` | Proxied (cam) |
| A | `www` | `<VPS_IP>` | Proxied (cam) |

**SSL/TLS Settings** → chọn **Full (strict)** khi dùng Cloudflare Origin Certificate.

---

## BƯỚC 11 — Deploy tự động (CI/CD)

Sau khi setup xong, mọi lần `git push origin main` sẽ tự động:

1. **Test** — TypeCheck + Vitest
2. **Build** — Docker image → push lên `ghcr.io/chuquangdoanh/hethongmmo:latest`
3. **Deploy** — SCP config → SSH vào VPS → pull image → `docker compose up -d`

Trigger thủ công: **GitHub → repo → Actions → CI/CD → Run workflow**

---

## Lệnh vận hành thường dùng

```bash
# Trạng thái
docker compose ps

# Logs real-time
docker compose logs -f web
docker compose logs -f nginx

# Restart 1 service
docker compose restart web

# Monitoring qua SSH tunnel (mở trên máy local trước)
ssh -L 19999:localhost:19999 deploy@<VPS_IP>
# Sau đó mở: http://localhost:19999

# Backup thủ công
docker exec hethongmmo-backup sh /backup.sh

# Vào psql
docker exec -it hethongmmo-pg psql -U app_user -d hethongmmo
```

---

## Lưu ý quan trọng

- File `.env` **KHÔNG commit** lên git — chỉ tồn tại trên VPS tại `/opt/hethongmmo/.env`
- SSL cert phải đặt đúng tại `infra/nginx/ssl/fullchain.pem` và `privkey.pem`
- PostgreSQL port `5433` chỉ bind `127.0.0.1` — không mở ra ngoài
- Netdata port `19999` chỉ bind `127.0.0.1` — access qua SSH tunnel
- Nếu migrate thất bại, container `web` sẽ không start (vì `depends_on: migrate: condition: service_completed_successfully`)
