import { describe, it, expect } from "vitest";
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generateSecureToken,
} from "@/lib/auth/password";

describe("validatePasswordStrength", () => {
  it("accepts a strong password", () => {
    const result = validatePasswordStrength("StrongPass1!secure");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects password shorter than 8 chars", () => {
    const { valid, errors } = validatePasswordStrength("Ab!1234");
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("8 ký tự"))).toBe(true);
  });

  it("rejects missing uppercase", () => {
    const { valid, errors } = validatePasswordStrength("nouppercase!!");
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("chữ hoa"))).toBe(true);
  });

  it("rejects missing special char", () => {
    const { valid, errors } = validatePasswordStrength("NoSpecialChar");
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("đặc biệt"))).toBe(true);
  });

  it("reports all failing rules at once", () => {
    const { valid, errors } = validatePasswordStrength("ab");
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies correct password", async () => {
    const hash = await hashPassword("Test@Password1!");
    expect(await verifyPassword(hash, "Test@Password1!")).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("Test@Password1!");
    expect(await verifyPassword(hash, "Wrong@Password1!")).toBe(false);
  });

  it("returns false for the RESET_REQUIRED sentinel", async () => {
    expect(await verifyPassword("$RESET_REQUIRED$", "anything")).toBe(false);
  });

  it("produces different hashes for same password (salt randomness)", async () => {
    const h1 = await hashPassword("Same@Password1!");
    const h2 = await hashPassword("Same@Password1!");
    expect(h1).not.toBe(h2);
  });
});

describe("generateSecureToken", () => {
  it("returns a hex string of the expected length", () => {
    const token = generateSecureToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different values each call", () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });
});
