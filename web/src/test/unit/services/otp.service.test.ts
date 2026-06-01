import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    otpCode: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: "otp-1" }),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(null),
    },
  },
}));

import { generateOtp, verifyOtp } from "@/lib/services/otp.service";
import { prisma } from "@/lib/db/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOtp = (prisma as any).otpCode as {
  deleteMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe("generateOtp", () => {
  it("returns a 6-digit string", async () => {
    const code = await generateOtp("user@example.com", "REGISTER");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("invalidates existing OTPs before creating new one", async () => {
    await generateOtp("user@example.com", "REGISTER");
    expect(mockOtp.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@example.com", purpose: "REGISTER", usedAt: null },
    });
    expect(mockOtp.create).toHaveBeenCalledOnce();
  });

  it("stores a bcrypt hash, not the plain code", async () => {
    const code = await generateOtp("user@example.com", "RESET_PASSWORD");
    const createCall = mockOtp.create.mock.calls[0]?.[0];
    expect(createCall?.data?.codeHash).not.toBe(code);
    expect(createCall?.data?.codeHash).toMatch(/^\$2[ab]\$/);
  });

  it("sets expiry in the future", async () => {
    await generateOtp("user@example.com", "REGISTER", "user-id", "1.2.3.4");
    const createCall = mockOtp.create.mock.calls[0]?.[0];
    expect(new Date(createCall?.data?.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("verifyOtp", () => {
  it("returns error when no active OTP found", async () => {
    mockOtp.findFirst.mockResolvedValueOnce(null);
    const result = await verifyOtp("user@example.com", "REGISTER", "123456");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/hết hạn/);
  });

  it("returns error when max attempts exceeded, deletes the record", async () => {
    mockOtp.findFirst.mockResolvedValueOnce({
      id: "otp-1",
      attempts: 5,
      maxAttempts: 5,
      codeHash: "$2b$12$fake",
    });
    const result = await verifyOtp("user@example.com", "REGISTER", "000000");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/vô hiệu hóa/);
    expect(mockOtp.delete).toHaveBeenCalledWith({ where: { id: "otp-1" } });
  });

  it("increments attempt counter on wrong code", async () => {
    mockOtp.findFirst.mockResolvedValueOnce({
      id: "otp-1",
      attempts: 1,
      maxAttempts: 5,
      // bcrypt hash of "999999" — won't match "000000"
      codeHash: "$2b$12$invalidhashfortesting00000000000000000000000",
    });
    // bcrypt.compare will return false for the bad hash
    mockOtp.update.mockResolvedValueOnce({});
    const result = await verifyOtp("user@example.com", "REGISTER", "000000");
    expect(result.success).toBe(false);
    expect(mockOtp.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data: { attempts: 2 },
    });
    expect(result.attemptsRemaining).toBe(3);
  });
});
