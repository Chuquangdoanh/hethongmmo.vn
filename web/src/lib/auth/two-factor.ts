import * as OTPAuth from "otpauth";
import { randomBytes } from "crypto";
import { encrypt, decrypt } from "@/lib/security/encryption";

const ISSUER = "hethongmmo.vn";

/**
 * Generates a new TOTP secret for 2FA setup.
 * Returns the base32 secret, otpauth URI, and a QR code URL.
 */
export function generateTotpSecret(userEmail: string): {
  secret: string;
  uri: string;
  qrUrl: string;
} {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const uri = totp.toString();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;

  return { secret: secret.base32, uri, qrUrl };
}

/**
 * Verifies a TOTP code against an AES-encrypted secret stored in the DB.
 * Allows ±1 time window (30s tolerance for clock drift).
 */
export function verifyTotp(secretEnc: Buffer, code: string): boolean {
  const secretBase32 = decrypt(secretEnc);
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/** Encrypts a base32 TOTP secret for storage in the DB. */
export function encryptTotpSecret(secretBase32: string): Buffer {
  return encrypt(secretBase32);
}

/**
 * Generates 8 one-time backup codes (8 hex chars each).
 * Caller is responsible for hashing and storing them.
 */
export function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => randomBytes(4).toString("hex"));
}
