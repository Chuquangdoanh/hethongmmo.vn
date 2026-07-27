import argon2 from "argon2";
import { createHash, randomBytes } from "crypto";

// OWASP 2024: Argon2id mem=64MB, time=3, parallel=4
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// Bàn phím ảo mobile (Gboard/Samsung Keyboard/iOS) ở chế độ nhập thường (type="text",
// dùng ở form đăng ký để user tự soi lại mật khẩu) có thể chèn ký tự vô hình
// (zero-width space, BOM) hoặc khoảng trắng/CR/tab thừa ở đầu-cuối khi gõ/chạm gợi ý —
// điều không xảy ra ở chế độ nhập bảo mật (type="password", dùng ở form đăng nhập).
// Cùng một mật khẩu người dùng gõ có thể lệch nhau đúng các ký tự này giữa lúc hash và
// lúc verify, khiến argon2 báo sai dù mật khẩu "đúng". Loại bỏ đối xứng ở cả 2 chiều.
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF]/g;

function sanitizePasswordInput(password: string): string {
  return password
    .normalize("NFC")
    .replace(INVISIBLE_CHARS_REGEX, "")
    .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(sanitizePasswordInput(password), ARGON2_OPTIONS);
}

// normalize("NFC") tránh mobile IME (Telex/VNI có dấu) sinh Unicode khác dạng
// so với lúc hash, khiến verify fail dù người dùng gõ đúng mật khẩu.
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (hash === "$RESET_REQUIRED$") return false;
  return argon2.verify(hash, sanitizePasswordInput(password));
}

/**
 * Validates password strength.
 * Min 8 chars, 1 uppercase, 1 special char.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Mật khẩu cần ít nhất 8 ký tự");
  if (!/[A-Z]/.test(password)) errors.push("Cần ít nhất 1 chữ hoa (A-Z)");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Cần ít nhất 1 ký tự đặc biệt (!@#$%...)");
  return { valid: errors.length === 0, errors };
}

/**
 * Checks password against HaveIBeenPwned using k-anonymity.
 * Throws Error("PASSWORD_PWNED") if the password appears in breach data.
 * Fails open (no-op) if the HIBP API is unreachable.
 */
export async function checkPwnedPassword(password: string): Promise<void> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  let res: Response;
  try {
    res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return; // Fail open — don't block registration if HIBP is unreachable
  }

  if (!res.ok) return;

  const text = await res.text();
  const pwned = text.split("\r\n").some((line) => {
    const hash = line.split(":")[0];
    return hash === suffix;
  });

  if (pwned) {
    throw new Error("PASSWORD_PWNED");
  }
}

/** Generates a cryptographically secure random token (hex string). */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
