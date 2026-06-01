/**
 * Tạo tài khoản ADMIN cho local dev.
 * Chạy từ root: node scripts/create-admin.mjs
 *
 * Yêu cầu: Docker postgres đang chạy (port 5433).
 */

import { randomUUID } from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// Resolve từ web/node_modules vì scripts/ không có node_modules riêng
const _require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../web/package.json")
);
const { Client } = _require("pg");
const argon2 = _require("argon2");

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://app_user@127.0.0.1:5433/hethongmmo";

const rl = readline.createInterface({ input, output });
console.log("=== Tạo tài khoản ADMIN ===\n");

const email    = await rl.question("Email: ");
const fullName = await rl.question("Họ tên: ");
const password = await rl.question("Mật khẩu (min 12 ký tự): ");
rl.close();

if (!email || !fullName || password.length < 12) {
  console.error("Lỗi: email/tên không được để trống, mật khẩu ít nhất 12 ký tự.");
  process.exit(1);
}

const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

const id        = randomUUID();
const uidPrefix = id.replace(/-/g, "").slice(0, 8);
const now       = new Date();

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (rows.length > 0) {
    console.error(`Lỗi: Email "${email}" đã tồn tại.`);
    process.exit(1);
  }

  await client.query(
    `INSERT INTO users (
       id, email, email_verified_at, password_hash, full_name,
       role, status, balance, total_deposited, total_spent,
       seller_status, max_seller_products,
       two_factor_enabled, failed_login_count,
       uid_prefix, created_at, updated_at
     ) VALUES (
       $1, $2, NOW(), $3, $4,
       'ADMIN', 'ACTIVE', 0, 0, 0,
       'NONE', 3,
       false, 0,
       $5, $6, $6
     )`,
    [id, email, passwordHash, fullName, uidPrefix, now]
  );

  console.log("\nTao thanh cong!");
  console.log(`  ID:         ${id}`);
  console.log(`  Email:      ${email}`);
  console.log(`  uid_prefix: ${uidPrefix}`);
  console.log(`  Role:       ADMIN`);
  console.log(`  Status:     ACTIVE`);
  console.log("\nDang nhap tai: http://localhost:3000/dang-nhap");
  console.log("Trang admin:   http://localhost:3000/admin/dashboard");
} finally {
  await client.end();
}
