import argon2 from "argon2";
import { createHash, randomBytes } from "crypto";

// OWASP 2024: Argon2id mem=64MB, time=3, parallel=4
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (hash === "$RESET_REQUIRED$") return false;
  return argon2.verify(hash, password);
}

/**
 * Validates password strength.
 * Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Mật khẩu cần ít nhất 12 ký tự");
  if (!/[A-Z]/.test(password)) errors.push("Cần ít nhất 1 chữ hoa (A-Z)");
  if (!/[a-z]/.test(password)) errors.push("Cần ít nhất 1 chữ thường (a-z)");
  if (!/[0-9]/.test(password)) errors.push("Cần ít nhất 1 chữ số (0-9)");
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
