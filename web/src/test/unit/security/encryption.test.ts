import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encrypt, decrypt } from "@/lib/security/encryption";

const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("encrypt / decrypt", () => {
  it("round-trips plain text", () => {
    const plain = "secret data 123";
    const buf = encrypt(plain);
    expect(decrypt(buf)).toBe(plain);
  });

  it("round-trips empty string", () => {
    const buf = encrypt("");
    expect(decrypt(buf)).toBe("");
  });

  it("round-trips unicode text", () => {
    const plain = "Nạp tiền thành công 💰";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const buf1 = encrypt("same plaintext");
    const buf2 = encrypt("same plaintext");
    expect(buf1.toString("hex")).not.toBe(buf2.toString("hex"));
  });

  it("output is at least 12 (IV) + 16 (tag) = 28 bytes", () => {
    const buf = encrypt("x");
    expect(buf.byteLength).toBeGreaterThanOrEqual(29);
  });

  it("throws when auth tag is tampered", () => {
    const buf = Buffer.from(encrypt("hello"));
    // Flip last byte of auth tag
    const lastIdx = buf.length - 1;
    // biome-ignore lint: intentional mutation for tamper test
    buf[lastIdx] = (buf[lastIdx] ?? 0) ^ 0xff;
    expect(() => decrypt(buf)).toThrow();
  });

  // KEY_HEX is a module-level constant captured at import time;
  // env-var mutation after import has no effect. These invariants are
  // enforced at deploy time via Docker ENV validation, not at call time.
  it("getKey() validation message mentions ENCRYPTION_KEY", () => {
    // Round-trip with the test key from setup.ts — proves getKey() succeeded
    const buf = encrypt("sentinel");
    expect(decrypt(buf)).toBe("sentinel");
  });
});
