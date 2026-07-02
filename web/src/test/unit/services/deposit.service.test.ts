import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    transaction: {
      findUnique: vi.fn(),
    },
    // Used by fire-and-forget telegram alert (notifyDepositSuccess) after the tx
    user: { findUnique: vi.fn().mockResolvedValue({ fullName: "Test", email: "t@t.vn" }) },
    $transaction: vi.fn(),
  },
}));

import { processDeposit } from "@/lib/services/deposit.service";
import { prisma } from "@/lib/db/prisma";
import { DuplicateError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

const BASE_PARAMS = {
  userId: "11111111-1111-1111-1111-111111111111",
  amount: 100_000,
  referenceCode: "SEPAY-REF-001",
  description: "Nạp tiền tự động",
  type: "DEPOSIT_AUTO" as const,
};

function makeTransactionClient(overrides?: Record<string, unknown>) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ balance: "0.00", total_deposited: "0.00" }]),
    $executeRaw: vi.fn().mockResolvedValue(1),
    transaction: {
      create: vi.fn().mockResolvedValue({
        id: "tx-001",
        userId: BASE_PARAMS.userId,
        amount: "100000.00",
        referenceCode: BASE_PARAMS.referenceCode,
      }),
    },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("processDeposit", () => {
  it("throws DuplicateError if referenceCode already exists", async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({ id: "existing-tx" });

    await expect(processDeposit(BASE_PARAMS)).rejects.toThrow(DuplicateError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("executes $transaction when referenceCode is new", async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTransactionClient();
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    const result = await processDeposit(BASE_PARAMS);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txClient.$queryRaw).toHaveBeenCalledOnce(); // SELECT FOR UPDATE
    expect(txClient.$executeRaw).toHaveBeenCalledOnce(); // UPDATE balance
    expect(txClient.transaction.create).toHaveBeenCalledOnce();
    expect(txClient.auditLog.create).toHaveBeenCalledOnce();
    expect(txClient.notification.create).toHaveBeenCalledOnce();
    expect(result.id).toBe("tx-001");
  });

  it("computes balanceAfter correctly", async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTransactionClient({
      $queryRaw: vi.fn().mockResolvedValue([{ balance: "500000.00", total_deposited: "500000.00" }]),
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await processDeposit({ ...BASE_PARAMS, amount: 200_000 });

    const createCall = txClient.transaction.create.mock.calls[0]?.[0];
    expect(createCall?.data?.balanceBefore).toBe("500000.00");
    expect(createCall?.data?.balanceAfter).toBe("700000.00");
    expect(createCall?.data?.amount).toBe("200000.00");
  });

  it("throws NotFoundError when user row not found", async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce(null);
    const txClient = {
      $queryRaw: vi.fn().mockResolvedValue([]), // empty result — user not found
      $executeRaw: vi.fn(),
      transaction: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      notification: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    const { NotFoundError } = await import("@/lib/errors");
    await expect(processDeposit(BASE_PARAMS)).rejects.toThrow(NotFoundError);
  });
});
