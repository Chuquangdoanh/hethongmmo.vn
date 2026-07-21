# VPS Migration — Chuyển production sang VPS mới (đổi IP)

> Dùng khi cần thay VPS mới hoàn toàn (đổi nhà cung cấp, đổi IP, nâng cấp phần cứng...)
> nhưng vẫn giữ nguyên domain `hethongmmo.vn`.
> Khác với [`deploy.md`](deploy.md) (dựng VPS mới cho hệ thống **chưa có** dữ liệu thật) —
> tài liệu này xử lý thêm phần **di chuyển dữ liệu sống + cutover an toàn + gỡ VPS cũ**.

---

## Nguyên tắc cốt lõi

1. **VPS cũ giữ nguyên, tiếp tục phục vụ traffic thật** cho đến khi VPS mới được xác nhận hoạt động ổn định.
2. **Chỉ gỡ VPS cũ SAU KHI** đã cutover DNS thành công và theo dõi ổn định tối thiểu 24–48h.
3. Đây là hệ thống tiền thật (balance, nạp/rút) — migration DB phải qua **1 cửa sổ bảo trì ngắn** để không mất giao dịch phát sinh giữa lúc dump và lúc go-live trên VPS mới.
4. Gỡ VPS cũ (destroy tại nhà cung cấp) là **hành động không thể hoàn tác** — luôn xác nhận lại với chủ dự án trước khi thực hiện Giai đoạn 6.

## Tổng quan các giai đoạn

```
GĐ 1 — Dựng VPS mới song song (VPS cũ không đụng vào, vẫn phục vụ traffic thật)
GĐ 2 — Copy secrets + cấu hình sang VPS mới
GĐ 3 — Restore dữ liệu + test VPS mới qua IP trực tiếp (chưa đổi DNS)
GĐ 4 — Cửa sổ bảo trì ngắn: đồng bộ dữ liệu mới nhất + cutover DNS
GĐ 5 — Theo dõi ổn định
GĐ 6 — Gỡ bỏ VPS cũ
```

---

## GĐ 1 — Dựng VPS mới

Làm đúng **Bước 1 → Bước 4** trong [`deploy.md`](deploy.md): tạo user `deploy`, hardening SSH, firewall, cài Docker, tạo cấu trúc thư mục `/opt/hethongmmo`.

### SSL Certificate — lưu ý riêng cho migration

Nếu VPS cũ đang dùng **Cloudflare Origin Certificate** (Cách 2 trong `deploy.md`): cert này gắn với **domain**, không gắn với IP — copy nguyên file cũ sang VPS mới là dùng được ngay, không cần xin cấp lại:

```bash
scp -i ~/.ssh/hethongmmo_deploy deploy@<OLD_IP>:/opt/hethongmmo/infra/nginx/ssl/fullchain.pem /tmp/
scp -i ~/.ssh/hethongmmo_deploy deploy@<OLD_IP>:/opt/hethongmmo/infra/nginx/ssl/privkey.pem   /tmp/
scp -i ~/.ssh/hethongmmo_deploy /tmp/fullchain.pem /tmp/privkey.pem deploy@<NEW_IP>:/opt/hethongmmo/infra/nginx/ssl/
ssh deploy@<NEW_IP> chmod 600 /opt/hethongmmo/infra/nginx/ssl/*.pem
```

Nếu VPS cũ đang dùng **Let's Encrypt** (Cách 1): plugin `--standalone` cần domain đã trỏ đúng VPS đang xin cert — xung đột với việc test VPS mới **trước khi** đổi DNS. Chọn một trong hai:
- Chuyển sang Cloudflare Origin Certificate cho lần migration này (đơn giản nhất — xem `deploy.md` Cách 2), hoặc
- Dùng `certbot` với plugin `dns-cloudflare` (DNS-01 challenge, không cần domain trỏ đúng VPS lúc xin cert).

---

## GĐ 2 — Copy secrets + cấu hình

Copy `docker-compose.yml` + `infra/` từ repo (Bước 6 `deploy.md`):

```bash
cd C:\Hethongmmo
scp -i ~/.ssh/hethongmmo_deploy docker-compose.yml deploy@<NEW_IP>:/opt/hethongmmo/
scp -i ~/.ssh/hethongmmo_deploy -r infra/ deploy@<NEW_IP>:/opt/hethongmmo/
```

### `.env` — KHÔNG generate secret mới, copy nguyên từ VPS cũ

```bash
scp -i ~/.ssh/hethongmmo_deploy deploy@<OLD_IP>:/opt/hethongmmo/.env /tmp/hethongmmo.env
scp -i ~/.ssh/hethongmmo_deploy /tmp/hethongmmo.env deploy@<NEW_IP>:/opt/hethongmmo/.env
ssh -i ~/.ssh/hethongmmo_deploy deploy@<NEW_IP> chmod 600 /opt/hethongmmo/.env
```

**Vì sao bắt buộc dùng nguyên `.env` cũ, không được tạo `ENCRYPTION_KEY`/`AUTH_SECRET` mới:**

| Biến | Nếu đổi giá trị |
|------|-----------------|
| `ENCRYPTION_KEY` | Toàn bộ cột `*_enc` (bank info, `two_factor_secret_enc`, `content_url_enc`, `value_enc`, `content_enc`) trong DB hiện có **không giải mã được nữa — mất dữ liệu vĩnh viễn** |
| `AUTH_SECRET` | Mọi session hiện có bị invalid — user bị logout hàng loạt (không mất dữ liệu, chỉ phiền) |
| `SEPAY_WEBHOOK_SECRET` | Phải cập nhật lại trên SePay dashboard mới nạp tiền tự động tiếp tục hoạt động — **không đổi trừ khi chủ động rotate** |
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD` | Chỉ dùng nội bộ Docker network → an toàn nếu đổi, nhưng giữ nguyên cho đơn giản |
| `AUTH_URL` / `APP_URL` / `NEXT_PUBLIC_*` | Domain giữ nguyên → **không cần đổi** dù IP phía sau đổi |

---

## GĐ 3 — Restore dữ liệu + test qua IP trực tiếp (chưa đổi DNS)

Dùng đúng flow disaster-recovery đã có sẵn ở [`scripts/restore.sh`](../../scripts/restore.sh) (kéo bản backup R2 mới nhất, restore DB + uploads + SSL):

```bash
ssh -i ~/.ssh/hethongmmo_deploy deploy@<NEW_IP>
cd /opt/hethongmmo

docker compose up -d postgres     # chờ healthy
./scripts/restore.sh              # restore bản backup R2 mới nhất — gõ YES khi được hỏi
docker compose up -d              # khởi động toàn bộ stack
docker compose ps                 # chờ hethongmmo-web = healthy
```

> `restore.sh` cũng ghi đè SSL cert bằng bản trong backup R2 — không sao nếu đó là cùng Origin Certificate đã copy ở GĐ1.

### Test qua IP trực tiếp — KHÔNG cần đổi DNS

Giả `Host` header để Nginx route đúng server block mà không ảnh hưởng traffic thật:

```bash
curl -k -H "Host: hethongmmo.vn" https://<NEW_IP>/api/health
curl -k -H "Host: hethongmmo.vn" -o /dev/null -w "%{http_code}\n" https://<NEW_IP>/
```

Muốn duyệt bằng trình duyệt thật: sửa tạm `C:\Windows\System32\drivers\etc\hosts` trên máy local, thêm dòng `<NEW_IP> hethongmmo.vn`, xoá lại sau khi test xong.

**Kiểm tra kỹ trước khi qua GĐ4:**
- Đăng nhập thử bằng tài khoản thật — session/password hoạt động bình thường (xác nhận `AUTH_SECRET` copy đúng)
- Mở vài đơn hàng có nội dung mã hoá (tut-trick, mmo product đã mua) — xác nhận không lỗi decrypt (`ENCRYPTION_KEY` copy đúng)
- `docker logs hethongmmo-web --tail 100` — không có lỗi bất thường
- `docker compose ps` — tất cả container `healthy`/`Up`, riêng `hethongmmo-migrate` là `Exited (0)` (bình thường)

---

## GĐ 4 — Cửa sổ bảo trì ngắn + cutover

Vì là hệ thống tiền, cần tránh lệch dữ liệu giữa bản backup dùng để restore (GĐ3) và giao dịch phát sinh thêm trên VPS cũ sau đó.

1. **Backup thủ công VPS cũ ngay trước cutover** để có bản mới nhất tại thời điểm chuyển:
   ```bash
   ssh -i ~/.ssh/hethongmmo_deploy deploy@<OLD_IP>
   cd /opt/hethongmmo
   docker compose exec backup sh /backup.sh
   # chờ log "Hoàn thành... Không có lỗi ✓"
   ```

2. **Tạm dừng nhận request mới trên VPS cũ** (tránh giao dịch phát sinh sau bản backup ở bước 1):
   ```bash
   docker compose stop web
   ```

3. **VPS mới**: restore lại bằng bản backup mới nhất vừa tạo:
   ```bash
   ssh -i ~/.ssh/hethongmmo_deploy deploy@<NEW_IP>
   cd /opt/hethongmmo
   ./scripts/restore.sh latest
   docker compose up -d
   ```

4. Verify VPS mới healthy + smoke test lần cuối (như GĐ3).

5. **Đổi Cloudflare DNS** — Dashboard → DNS → sửa A record `@` và `www` → trỏ sang `<NEW_IP>` (giữ Proxied/cam).

6. **Đổi GitHub Actions secret** `PRODUCTION_HOST` → `<NEW_IP>`
   (Repo → Settings → Secrets and variables → Actions → `PRODUCTION_HOST` → Update).

7. **Đăng ký self-hosted runner mới trên VPS mới** — vì runner CI/CD chạy chung máy với production (xem [`vps-deploy.md`](vps-deploy.md) mục "Cài lại Runner"):
   ```bash
   ssh -i ~/.ssh/hethongmmo_deploy deploy@<NEW_IP>
   mkdir -p ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner-linux-x64.tar.gz -L [LINK_TỪ_GITHUB_SETTINGS_ACTIONS_RUNNERS]
   tar xzf ./actions-runner-linux-x64.tar.gz
   ./config.sh --url https://github.com/Chuquangdoanh/hethongmmo.vn --token [TOKEN_MỚI]
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```
   Deploy job trong `deploy.yml` luôn SSH vào secret `PRODUCTION_HOST` bất kể job build chạy trên runner nào, nên về mặt đúng-sai không bắt buộc phải gỡ runner cũ ngay lập tức — nhưng nên gỡ sớm sau khi runner mới hoạt động ổn để tránh phí CPU build trên VPS sắp bị huỷ (xem GĐ6).

8. Cloudflare có thể mất vài phút để traffic thật chuyển hẳn sang IP mới — verify từ ngoài:
   ```bash
   curl -s https://hethongmmo.vn/api/health
   ```

9. SePay gọi webhook theo domain (qua Cloudflare), không theo IP VPS trực tiếp — **không cần đổi gì bên SePay** khi chỉ đổi IP VPS.

10. Mở lại ghi trên VPS mới — thực chất đã full từ bước 3, VPS mới giờ nhận toàn bộ traffic thật.

---

## GĐ 5 — Theo dõi ổn định (trước khi gỡ VPS cũ)

Theo dõi tối thiểu **24–48h** trước khi qua GĐ6:

```bash
docker logs -f hethongmmo-web
ssh -L 19999:localhost:19999 deploy@<NEW_IP>   # mở http://localhost:19999 — xem vps-monitoring.md
```

- Kiểm tra nạp tiền tự động (SePay webhook) vẫn cộng balance đúng
- Kiểm tra seller rút tiền, đơn hàng mới hoạt động bình thường
- Không có lỗi decrypt hàng loạt, không có spike lỗi 500 trong log Nginx

**Giữ nguyên VPS cũ ở trạng thái đứng yên** (`docker compose stop` — không `down`, không xoá volume) làm phương án rollback nhanh: nếu VPS mới gặp sự cố, chỉ cần đổi DNS ngược lại + `docker compose start` trên VPS cũ.

---

## GĐ 6 — Gỡ bỏ VPS cũ

> **Chỉ thực hiện sau khi GĐ5 xác nhận ổn định.** Xác nhận lại với chủ dự án trước bước 5 (destroy VPS) — không thể hoàn tác.

1. Backup lần cuối trên VPS cũ để lưu trữ (dù dữ liệu không đổi từ lúc cutover):
   ```bash
   ssh -i ~/.ssh/hethongmmo_deploy deploy@<OLD_IP>
   cd /opt/hethongmmo && docker compose exec backup sh /backup.sh
   ```
2. Dừng toàn bộ stack: `docker compose down`
3. Gỡ self-hosted runner cũ khỏi GitHub (nếu chưa gỡ ở GĐ4 bước 7):
   ```bash
   cd ~/actions-runner
   sudo ./svc.sh stop
   sudo ./svc.sh uninstall
   ./config.sh remove
   ```
4. Xoá/revoke SSH key `deploy` riêng cho VPS cũ nếu không dùng chung với VPS mới.
5. Tại nhà cung cấp VPS (Hetzner/DigitalOcean/...): **destroy VPS cũ** — thao tác không thể hoàn tác, xác nhận kỹ.
6. Cập nhật `~/.ssh/config` local (alias `ssh hethongmmo`) trỏ sang `<NEW_IP>`.
7. Ghi log vào [`.claude/logs/completed-tasks.md`](../logs/completed-tasks.md) theo format đã quy định.

---

## Checklist tổng hợp

```
[ ] VPS mới dựng xong, healthy qua IP trực tiếp (GĐ1–GĐ3)
[ ] .env copy y nguyên từ VPS cũ — đặc biệt ENCRYPTION_KEY, AUTH_SECRET, SEPAY_WEBHOOK_SECRET
[ ] SSL cert hoạt động (Origin Cert domain-bound — không cần đổi khi IP đổi)
[ ] Backup mới nhất trước cutover đã restore lên VPS mới (GĐ4 bước 1–3)
[ ] Đăng nhập thử + mở nội dung mã hoá thành công trên VPS mới (không lỗi decrypt/session)
[ ] DNS Cloudflare đã trỏ sang IP mới, verify từ ngoài qua domain thật
[ ] GitHub secret PRODUCTION_HOST đã cập nhật
[ ] Runner mới đăng ký và hoạt động
[ ] Theo dõi ổn định ≥ 24–48h (nạp/rút tiền, log lỗi, Netdata)
[ ] Xác nhận với chủ dự án trước khi destroy VPS cũ
[ ] VPS cũ đã destroy, runner cũ đã gỡ, SSH key cũ đã revoke
```
