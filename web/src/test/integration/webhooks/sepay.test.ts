import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    unmatchedTransfer: { upsert: vi.fn() },
    tickerNotification: { create: vi.fn() },
  },
}));

vi.mock("@/lib/services/deposit.service", () => ({
  processDeposit: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/sepay/route";
import { prisma } from "@/lib/db/prisma";
import { processDeposit } from "@/lib/services/deposit.service";
import { DuplicateError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockProcessDeposit = processDeposit as ReturnType<typeof vi.fn>;

const SECRET = process.env.SEPAY_WEBHOOK_SECRET!;
const USER_ID = "aabbccdd-1234-5678-abcd-ef0123456789";
// uid_prefix is the 8 hex chars of user UUID
const UID_PREFIX = "aabbccdd";

function buildPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 1001,
    gateway: "VCB",
    transactionDate: "2026-05-22 14:00:00",
    accountNumber: "1234567890",
    content: `${UID_PREFIX} chuyen tien nap vi`,
    transferType: "in",
    transferAmount: 100_000,
    referenceCode: `SEPAY-${Date.now()}`,
    ...overrides,
  };
}

function makeRequest(body: unknown, apiKey?: string): Request {
  const bodyStr = JSON.stringify(body);
  return new Request("http://localhost/api/webhooks/sepay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Apikey": apiKey ?? SECRET,  // SePay gửi plain key qua Apikey header
    },
    body: bodyStr,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tickerNotification.create.mockResolvedValue({});
});

describe("POST /api/webhooks/sepay", () => {
  it("returns 200 with success:false for invalid API key", async () => {
    const req = makeRequest(buildPayload(), "wrong-api-key");
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/signature|key/i);
    expect(mockProcessDeposit).not.toHaveBeenCalled();
  });

  it("returns 200 and skips outgoing transfers", async () => {
    const payload = buildPayload({ transferType: "out" });
    const req = makeRequest(payload);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockProcessDeposit).not.toHaveBeenCalled();
  });

  it("returns 200 and skips transfers below 10,000đ", async () => {
    const payload = buildPayload({ transferAmount: 5_000 });
    const req = makeRequest(payload);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockProcessDeposit).not.toHaveBeenCalled();
  });

  it("saves unmatched transfer when uid_prefix not found in content", async () => {
    const payload = buildPayload({ content: "no uid here just random text" });
    const req = makeRequest(payload);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockPrisma.unmatchedTransfer.upsert).toHaveBeenCalledOnce();
    expect(mockProcessDeposit).not.toHaveBeenCalled();
  });

  it("saves unmatched transfer when user not found for uid_prefix", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    const req = makeRequest(buildPayload());
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockPrisma.unmatchedTransfer.upsert).toHaveBeenCalledOnce();
    expect(mockProcessDeposit).not.toHaveBeenCalled();
  });

  it("calls processDeposit successfully for valid deposit", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{
      id: USER_ID,
      email: "user@example.com",
    }]);
    mockProcessDeposit.mockResolvedValueOnce({ id: "tx-001" });

    const payload = buildPayload();
    const req = makeRequest(payload);
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockProcessDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        amount: 100_000,
        type: "DEPOSIT_AUTO",
      }),
    );
  });

  it("handles duplicate referenceCode gracefully (idempotent — no error returned)", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{
      id: USER_ID,
      email: "user@example.com",
    }]);
    mockProcessDeposit.mockRejectedValueOnce(new DuplicateError("referenceCode"));

    const req = makeRequest(buildPayload({ referenceCode: "DUPLICATE-REF" }));
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    // Duplicate is swallowed — returns success:true to SePay so it doesn't retry
    expect(await res.json()).toMatchObject({ success: true });
  });

  it("returns 200 when payload fails Zod validation", async () => {
    const body = JSON.stringify({ invalid: "payload" });
    const req = new Request("http://localhost/api/webhooks/sepay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Apikey": SECRET },
      body,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/payload/i);
  });
});
