import dns from "node:dns";
import net from "node:net";

// VPS có địa chỉ IPv6 cho các host bên ngoài (vd: api.telegram.org) nhưng outbound
// IPv6 bị chặn/blackhole → Node "Happy Eyeballs" thử IPv6 trước, timeout, khiến
// fetch() ra ngoài (Telegram, v.v.) báo "AggregateError: fetch failed" ngẫu nhiên.
// Ưu tiên IPv4 luôn để né lỗi kết nối này.
// File riêng + chỉ được import động từ instrumentation.ts (nhánh runtime nodejs) —
// để bundler không đưa "node:dns" vào chunk Edge Runtime (middleware), gây crash.
dns.setDefaultResultOrder("ipv4first");

// Xác nhận qua log production (AggregateError tại internalConnectMultiple /
// internalConnectMultipleTimeout): dù đã ưu tiên IPv4 ở trên, Node vẫn mở NHIỀU
// kết nối TCP song song (Happy Eyeballs) tới cùng 1 host rồi đua nhau — trong
// network namespace của container này việc đua nhiều kết nối đồng thời bị timeout
// ở bước connect, trong khi 1 kết nối đơn (vd: wget) luôn thành công ngay lập tức.
// Tắt hẳn auto-select-family để fetch()/net.connect() chỉ mở 1 kết nối tuần tự,
// giống hành vi Node <18 và giống wget — loại bỏ hẳn kiểu lỗi AggregateError này.
net.setDefaultAutoSelectFamily(false);
