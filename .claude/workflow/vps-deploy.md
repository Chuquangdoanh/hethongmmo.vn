# VPS Deploy — Hướng dẫn triển khai

## Kiến trúc hiện tại

```
git push  →  GitHub nhận code
           →  Gửi job xuống VPS (self-hosted runner)
           →  VPS build Docker image
           →  VPS deploy (docker compose up)
           →  Xong
```

---

## Self-hosted Runner

Runner đang chạy nền 24/7 trên VPS, tự khởi động lại khi reboot.

### Kiểm tra trạng thái

```bash
cd ~/actions-runner
sudo ./svc.sh status
# Phải thấy: active (running)
```

### Các lệnh quản lý

```bash
sudo ./svc.sh start    # khởi động
sudo ./svc.sh stop     # dừng
sudo ./svc.sh restart  # khởi động lại
sudo ./svc.sh status   # kiểm tra
```

### Cài lại Runner (nếu cần)

1. Vào **GitHub repo → Settings → Actions → Runners → New self-hosted runner**
2. Chọn **Linux / x64** → copy lệnh có token mới
3. Chạy trên VPS:

```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove

# Cấu hình lại với token mới từ GitHub
./config.sh --url https://github.com/Chuquangdoanh/hethongmmo.vn --token TOKEN_MỚI

sudo ./svc.sh install
sudo ./svc.sh start
```

> Token lấy từ GitHub chỉ dùng 1 lần lúc `./config.sh` — sau đó runner tự lưu credentials, không hết hạn.

---

## Deploy thủ công (khi cần)

Dùng khi runner bị lỗi hoặc cần deploy gấp không qua CI/CD.

### Trên máy local (build + push image)

```powershell
# Login GHCR
gh auth token | docker login ghcr.io -u chuquangdoanh --password-stdin

# Build image
docker build --target runner -t ghcr.io/chuquangdoanh/hethongmmo:latest .

# Push
docker push ghcr.io/chuquangdoanh/hethongmmo:latest
```

### Trên VPS (SSH vào chạy)

```bash
ssh hethongmmo

cd /opt/hethongmmo
docker compose pull web
docker compose up -d web
docker image prune -f
```

### Script thủ công đầy đủ

```powershell
# Cấu hình (đặt 1 lần)
$env:VPS_HOST     = "IP_VPS"
$env:SSH_KEY_PATH = "C:\Users\HELLO\.ssh\deploy_key"
$env:GHCR_USER    = "chuquangdoanh"
$env:GHCR_PAT     = "ghp_xxxxxxxxxxxx"

# Chạy deploy
.\scripts\deploy-manual.ps1             # đầy đủ
.\scripts\deploy-manual.ps1 -SkipMigrator  # khi Prisma không đổi
.\scripts\deploy-manual.ps1 -SkipBuild     # chỉ restart VPS
```

---

## Kiểm tra sau deploy

```bash
# Trạng thái containers
docker ps --filter "name=hethongmmo" --format "table {{.Names}}\t{{.Status}}"

# Log web app
docker logs hethongmmo-web --tail 50

# Health check
curl -s http://127.0.0.1:3000/api/health
```

---

Tóm tắt lệnh cần chạy trên VPS ( GITHUB ACTION )

mkdir -p ~/actions-runner && cd ~/actions-runner
# (lấy link + token từ GitHub Settings → Runners → New runner)
curl -o actions-runner-linux-x64.tar.gz -L [LINK_TỪ_GITHUB]
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/Chuquangdoanh/hethongmmo.vn --token [TOKEN]
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status

## Thông tin VPS

| Thông tin | Giá trị |
|-----------|---------|
| SSH | `ssh hethongmmo` |
| User deploy | `deploy` |
| Thư mục app | `/opt/hethongmmo` |
| Runner | `/home/deploy/actions-runner` |
| Uploads | `/opt/hethongmmo/uploads` |
| Backups | `/opt/hethongmmo/backups` |
