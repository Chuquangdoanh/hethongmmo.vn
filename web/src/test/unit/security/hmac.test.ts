import { describe, it, expect } from "vitest";
import { signHmac, verifyHmac } from "@/lib/security/hmac";

describe("signHmac / verifyHmac", () => {
  const secret = "test-webhook-secret";
  const payload = JSON.stringify({ amount: 100000, content: "UID123 chuyen tien" });

  it("verifies a valid signature", () => {
    const sig = signHmac(secret, payload);
    expect(verifyHmac(secret, payload, sig)).toBe(true);
  });

  it("rejects tampered payload", () => {
    const sig = signHmac(secret, payload);
    expect(verifyHmac(secret, '{"amount":999}', sig)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const sig = signHmac(secret, payload);
    expect(verifyHmac("wrong-secret", payload, sig)).toBe(false);
  });

  it("rejects truncated signature (different length)", () => {
    const sig = signHmac(secret, payload).slice(0, 32);
    expect(verifyHmac(secret, payload, sig)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyHmac(secret, payload, "")).toBe(false);
  });

  it("rejects all-zeros signature", () => {
    const zeros = "0".repeat(64);
    expect(verifyHmac(secret, payload, zeros)).toBe(false);
  });

  it("produces consistent deterministic output", () => {
    expect(signHmac(secret, payload)).toBe(signHmac(secret, payload));
  });

  it("produces different signatures for different payloads", () => {
    const sig1 = signHmac(secret, "payload1");
    const sig2 = signHmac(secret, "payload2");
    expect(sig1).not.toBe(sig2);
  });
});
