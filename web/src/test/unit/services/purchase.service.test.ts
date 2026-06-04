import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/security/encryption", () => ({
  decrypt: vi.fn().mockReturnValue("decrypted-stock-content"),
  encrypt: vi.fn(),
}));

import { purchaseProduct } from "@/lib/services/purchase.service";
import { prisma } from "@/lib/db/prisma";
import { InsufficientBalanceError, OutOfStockError, ItemInactiveError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

const USER_ID = "user-0000-0000-0000-000000000001";
const ITEM_ID = "item-0000-0000-0000-000000000001";

const BASE_PARAMS = {
  userId: USER_ID,
  orderType: "SERVICE" as const,
  itemId: ITEM_ID,
  itemName: "Test Service",
  catalogPrice: 50_000,
  finalPrice: 50_000,
  discountPercent: 0,
  idempotencyKey: "idem-key-abc123",
};

function makeRichUser(balance = "1000000") {
  return [{ balance, total_spent: "0.00" }];
}

function makeTxClient(overrides?: Record<string, unknown>) {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
    order: {
      create: vi.fn().mockResolvedValue({
        id: "order-001",
        orderCode: "ORD-TEST-01",
        userId: USER_ID,
        status: "DONE",
        idempotencyKey: BASE_PARAMS.idempotencyKey,
      }),
    },
    transaction: { create: vi.fn() },
    notification: { create: vi.fn() },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("purchaseProduct", () => {
  it("returns existing order on duplicate idempotency key", async () => {
    const existing = { id: "order-exists", orderCode: "ORD-EXIST", status: "DONE" };
    mockPrisma.order.findUnique.mockResolvedValueOnce(existing);

    const result = await purchaseProduct(BASE_PARAMS);

    expect(result.order).toEqual(existing);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws InsufficientBalanceError when balance is too low", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTxClient({
      $queryRaw: vi.fn().mockResolvedValue([{ balance: "10000.00", total_spent: "0.00" }]),
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(purchaseProduct({ ...BASE_PARAMS, finalPrice: 50_000 })).rejects.toThrow(
      InsufficientBalanceError,
    );
  });

  it("throws OutOfStockError for MMO_PRODUCT when no items available", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTxClient({
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(makeRichUser()) // user balance
        .mockResolvedValueOnce([]), // no available items
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      purchaseProduct({ ...BASE_PARAMS, orderType: "MMO_PRODUCT" }),
    ).rejects.toThrow(OutOfStockError);
  });

  it("throws OutOfStockError for SELLER_PRODUCT when no stock", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTxClient({
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(makeRichUser())
        .mockResolvedValueOnce([]), // no stock
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      purchaseProduct({ ...BASE_PARAMS, orderType: "SELLER_PRODUCT" }),
    ).rejects.toThrow(OutOfStockError);
  });

  it("throws ItemInactiveError for SERVICE when item is inactive", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const txClient = makeTxClient({
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(makeRichUser())
        .mockResolvedValueOnce([{ is_active: false }]), // inactive
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(purchaseProduct(BASE_PARAMS)).rejects.toThrow(ItemInactiveError);
  });

  it("creates order successfully for an active SERVICE", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const createdOrder = { id: "order-new", orderCode: "ORD-NEW-01", status: "DONE" };
    const txClient = makeTxClient({
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(makeRichUser("1000000"))
        .mockResolvedValueOnce([{ is_active: true }]),
      order: { create: vi.fn().mockResolvedValue(createdOrder) },
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    const result = await purchaseProduct(BASE_PARAMS);

    expect(result.order).toEqual(createdOrder);
    expect(result.deliveredContent).toBeUndefined();
    expect(txClient.$executeRaw).toHaveBeenCalledOnce(); // balance update
  });

  it("decrypts and returns content for MMO_PRODUCT", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const fakeEncBuf = Buffer.from("encrypted-value");
    const txClient = makeTxClient({
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce(makeRichUser())
        .mockResolvedValueOnce([{ id: "item-001", value_enc: fakeEncBuf }]),
    });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    const result = await purchaseProduct({ ...BASE_PARAMS, orderType: "MMO_PRODUCT" });

    expect(result.deliveredContent).toBe("decrypted-stock-content");
  });
});
