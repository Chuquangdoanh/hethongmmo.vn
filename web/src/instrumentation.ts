/**
 * Next.js instrumentation hook — chạy một lần khi server khởi động.
 * Validates critical environment variables before accepting any requests.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Edge runtime không cần full env check (chỉ chạy middleware, không có DB)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // File riêng + dynamic import — bundler không được đưa "node:dns" vào chunk Edge Runtime
  await import("./instrumentation-node");

  const REQUIRED: Record<string, string> = {
    DATABASE_URL:    "PostgreSQL connection string",
    AUTH_SECRET:     "Auth.js JWT signing secret (min 32 chars)",
    ENCRYPTION_KEY:  "AES-256 key for bank data (64 hex chars)",
  };

  const missing = Object.entries(REQUIRED)
    .filter(([key]) => !process.env[key])
    .map(([key, desc]) => `  ❌ ${key.padEnd(20)} — ${desc}`);

  if (missing.length > 0) {
    const lines = [
      "",
      "╔══════════════════════════════════════════════════════╗",
      "║   STARTUP FAILED — Missing required env variables    ║",
      "╚══════════════════════════════════════════════════════╝",
      "",
      ...missing,
      "",
      "  Copy .env.example → .env và điền đầy đủ giá trị.",
      "  Xem: https://github.com/chuquangdoanh/hethongmmo",
      "",
    ];
    // Print to stderr so it appears in docker logs
    process.stderr.write(lines.join("\n") + "\n");
    process.exit(1);
  }

  // Warn (not fatal) cho optional vars khi ở production
  if (process.env.NODE_ENV === "production") {
    const RECOMMENDED: Record<string, string> = {
      RESEND_API_KEY:      "Email service (OTP, receipts sẽ không gửi được)",
      TURNSTILE_SECRET:    "Captcha protection (đăng nhập sẽ không có captcha)",
      UPSTASH_REDIS_REST_URL: "Rate limiting + session denylist (logout không an toàn)",
      R2_PUBLIC_URL:       "CDN cho ảnh (sẽ dùng proxy /api/storage/image thay thế)",
    };

    const notRecommended = Object.entries(RECOMMENDED)
      .filter(([key]) => !process.env[key])
      .map(([key, desc]) => `  ⚠️  ${key.padEnd(28)} — ${desc}`);

    if (notRecommended.length > 0) {
      process.stdout.write(
        [
          "",
          "[startup] WARN — Optional env vars not set:",
          ...notRecommended,
          "",
        ].join("\n") + "\n",
      );
    }
  }

  // Background job — tự resolve khiếu nại quá hạn phản hồi (seller 12h / buyer 2h /
  // buyer xác nhận 60') định kỳ, không phụ thuộc việc có ai đang mở tab chat hay không.
  const { scanOpenComplaintsForAutoResolution } = await import("@/lib/services/complaint-auto-resolve");
  const COMPLAINT_AUTO_RESOLVE_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

  const runComplaintAutoResolveScan = () => {
    scanOpenComplaintsForAutoResolution().catch((err) => {
      process.stderr.write(`[complaint-auto-resolve] scan failed: ${String(err)}\n`);
    });
  };

  runComplaintAutoResolveScan();
  setInterval(runComplaintAutoResolveScan, COMPLAINT_AUTO_RESOLVE_INTERVAL_MS);
}
