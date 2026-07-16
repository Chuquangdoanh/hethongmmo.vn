import dns from "node:dns";

// VPS có địa chỉ IPv6 cho các host bên ngoài (vd: api.telegram.org) nhưng outbound
// IPv6 bị chặn/blackhole → Node "Happy Eyeballs" thử IPv6 trước, timeout, khiến
// fetch() ra ngoài (Telegram, v.v.) báo "AggregateError: fetch failed" ngẫu nhiên.
// Ưu tiên IPv4 luôn để né lỗi kết nối này.
// File riêng + chỉ được import động từ instrumentation.ts (nhánh runtime nodejs) —
// để bundler không đưa "node:dns" vào chunk Edge Runtime (middleware), gây crash.
dns.setDefaultResultOrder("ipv4first");
