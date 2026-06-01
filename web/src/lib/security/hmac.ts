import { createHmac, timingSafeEqual } from "crypto";

export function signHmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmac(secret: string, payload: string, signature: string): boolean {
  const expected = signHmac(secret, payload);
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
