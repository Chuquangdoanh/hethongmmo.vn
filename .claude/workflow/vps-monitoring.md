# VPS Monitoring & Inspection — hethongmmo.vn

Tài liệu tách biệt khỏi `deploy.md` — chỉ dùng để **kiểm tra, giám sát** VPS đang chạy (không phải hướng dẫn deploy lần đầu). Dùng khi cần soát tình trạng VPS: file đang tồn tại, dữ liệu đang chạy, file nào nặng, request nào dồn nhiều — đặc biệt quan trọng khi nghi traffic tăng bất thường hoặc bị bắn request.

---

## 1 — Kiểm tra file đang có trên VPS

```bash
# Cấu trúc thư mục dự án (2 cấp)
tree -L 2 /opt/hethongmmo

# Danh sách + dung lượng từng thư mục con
ls -lah /opt/hethongmmo
du -sh /opt/hethongmmo/*

# Danh sách Docker volume đang dùng (data thật nằm ở đây)
docker volume ls
docker volume inspect hethongmmo_pg_data
```

---

## 2 — Dữ liệu / tiến trình đang chạy

```bash
# Container nào đang sống, trạng thái health
docker compose ps

# Resource usage real-time của từng container (CPU, RAM, Net I/O)
docker stats --no-stream

# Process bên trong 1 container cụ thể
docker top hethongmmo-web
docker top hethongmmo-pg

# Connection đang mở tới PostgreSQL — ai đang query gì, chạy bao lâu
docker exec -it hethongmmo-pg psql -U app_user -d hethongmmo \
  -c "SELECT pid, usename, client_addr, state, query, now()-query_start AS duration FROM pg_stat_activity ORDER BY duration DESC;"

# Số connection + client đang dùng Redis
docker exec -it hethongmmo-redis redis-cli -a "$REDIS_PASSWORD" INFO clients
```

---

## 3 — Chi tiết 1 file (size, quyền, thời gian sửa)

```bash
# Thông tin đầy đủ 1 file: size, owner, permission, lần sửa cuối
stat /opt/hethongmmo/.env

# Liệt kê chi tiết, sort theo size giảm dần
ls -lahS /opt/hethongmmo/uploads/

# File bị sửa trong 24h qua (phát hiện thay đổi bất thường / xâm nhập)
find /opt/hethongmmo -mtime -1 -type f

# Đường dẫn log thật của 1 container (để tail trực tiếp bằng tail -f)
docker inspect --format='{{.LogPath}}' hethongmmo-web
```

---

## 4 — Tìm file nào đang chiếm dung lượng lớn nhất

```bash
# Top 20 file lớn nhất toàn VPS
du -ahx / 2>/dev/null | sort -rh | head -20

# Top 10 file lớn nhất trong project
du -ah /opt/hethongmmo 2>/dev/null | sort -rh | head -10

# Dung lượng chi tiết Docker (images/containers/volumes/build cache)
docker system df -v

# Log container nào đang phình to nhất (nguyên nhân disk đầy thường gặp nhất)
du -sh /var/lib/docker/containers/*/*.log 2>/dev/null | sort -rh | head -5

# Disk còn trống bao nhiêu
df -h /
```

---

## 5 — Endpoint / IP nào đang bị bắn request nhiều nhất

```bash
# Top 20 URL bị gọi nhiều nhất (theo access log Nginx)
docker exec hethongmmo-nginx sh -c \
  "awk '{print \$7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20"

# Top 20 IP đang gửi request nhiều nhất
docker exec hethongmmo-nginx sh -c \
  "awk '{print \$1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20"

# Phân bố theo status code (phát hiện spike lỗi 429/500)
docker exec hethongmmo-nginx sh -c \
  "tail -5000 /var/log/nginx/access.log | awk '{print \$9}' | sort | uniq -c | sort -rn"

# IP đang bị Nginx rate-limit chặn (429) — danh sách "nghi vấn" rõ nhất
docker exec hethongmmo-nginx sh -c \
  "awk '\$9==429 {print \$1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20"
```

> **Ghi chú:** `log_format main` hiện tại (`infra/nginx/nginx.conf`) chưa có `$request_time` nên không đo được endpoint nào *chậm*, chỉ đo được endpoint nào *nhiều*. Nếu cần đo cả độ trễ, thêm `$request_time` vào `log_format` rồi `nginx -s reload`.

---

## 6 — Giám sát khi traffic tăng cao / nghi bị flood

```bash
# Load average 1/5/15 phút — vượt số core CPU liên tục là dấu hiệu quá tải
uptime

# RAM còn trống
free -h

# CPU / IO mỗi giây, lấy 5 mẫu
vmstat 1 5

# Tổng số connection đang ESTABLISHED
netstat -ant | grep ESTABLISHED | wc -l

# Top 20 IP có nhiều connection mở nhất (nghi ngờ DDoS/abuse)
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20

# Nginx có đang từ chối request do rate-limit không (xem có dòng "limiting requests")
docker compose logs nginx --tail 200 | grep "limiting requests"

# PostgreSQL còn dư connection pool không
docker exec -it hethongmmo-pg psql -U app_user -d hethongmmo -c "SELECT count(*) FROM pg_stat_activity;"
docker exec -it hethongmmo-pg psql -U app_user -d hethongmmo -c "SHOW max_connections;"

# Theo dõi Netdata real-time (đầy đủ biểu đồ CPU/RAM/Network/Disk)
ssh -L 19999:localhost:19999 deploy@<VPS_IP>
# Mở: http://localhost:19999
```

---

## 7 — Phản ứng nhanh khi xác định bị tấn công / bắn request

```bash
# Chặn 1 IP ngay trên VPS (tạm thời, mất khi reboot)
sudo iptables -A INPUT -s <BAD_IP> -j DROP

# Chặn vĩnh viễn qua ufw
sudo ufw deny from <BAD_IP> to any

# Chặn ngay tại Cloudflare — ưu tiên dùng cách này vì chặn TRƯỚC khi traffic chạm VPS
# Cloudflare Dashboard → Security → WAF → Tools → IP Access Rules → Block

# Nếu cần hạ tải tạm thời: bật "Under Attack Mode" toàn site
# Cloudflare Dashboard → Overview → quick action "Under Attack Mode" → ON
```
