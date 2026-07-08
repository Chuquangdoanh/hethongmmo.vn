import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    externalProduct: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/external-providers/providers-config", () => ({
  loadEnabledAdapters: vi.fn(),
}));

vi.mock("@/lib/services/telegram-alert.service", () => ({
  notifyPurchaseSuccess: vi.fn(),
  notifyKhuongfbRefund: vi.fn(),
}));

import { purchaseKhuongfbProduct } from "@/lib/khuongfb/fulfill.service";
import { prisma } from "@/lib/db/prisma";
import { loadEnabledAdapters } from "@/lib/external-providers/providers-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLoadEnabledAdapters = loadEnabledAdapters as any;

const USER_ID = "user-0000-0000-0000-000000000001";
const PRODUCT_ID = "product-0000-0000-0000-000000000001";

interface CapturedOrderData {
  originalPrice: Decimal;
  finalPrice: Decimal;
}

function makeTxClient(onOrderCreate: (data: CapturedOrderData) => void) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ balance: "1000000", total_spent: "0" }]),
    user: { update: vi.fn() },
    order: {
      create: vi.fn().mockImplementation(({ data }: { data: CapturedOrderData }) => {
        onOrderCreate(data);
        return Promise.resolve({ id: "order-001", orderCode: "KFB-TEST-01" });
      }),
    },
    transaction: { create: vi.fn() },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("purchaseKhuongfbProduct — discount", () => {
  it("applies agent discount (Đại lý) to the charged total, keeps catalog price in originalPrice", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    mockPrisma.externalProduct.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID, provider: "khuongfb", name: "Test KFB Product",
      salePrice: "100000", isEnabled: true, externalId: "ext-001",
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      discountPercent: 0, totalDeposited: "0", agentDiscountPercent: 15,
    });

    let captured: CapturedOrderData | undefined;
    const txClient = makeTxClient((data) => { captured = data; });
    mockPrisma.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown) => fn(txClient));
    mockLoadEnabledAdapters.mockResolvedValueOnce([
      { providerId: "khuongfb", buyProduct: vi.fn().mockResolvedValue({ externalOrderId: "ext-order-1", data: {} }) },
    ]);
    mockPrisma.order.update.mockResolvedValueOnce({});

    const result = await purchaseKhuongfbProduct({
      userId: USER_ID,
      externalProductId: PRODUCT_ID,
      quantity: 1,
      idempotencyKey: "idem-key-abc",
    });

    expect(result.finalPrice).toBe(85_000);
    expect(captured?.originalPrice.toNumber()).toBe(100_000);
    expect(captured?.finalPrice.toNumber()).toBe(85_000);
  });

  it("charges full catalog price when user has no discount at all", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    mockPrisma.externalProduct.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID, provider: "khuongfb", name: "Test KFB Product",
      salePrice: "50000", isEnabled: true, externalId: "ext-001",
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      discountPercent: 0, totalDeposited: "0", agentDiscountPercent: 0,
    });

    let captured: CapturedOrderData | undefined;
    const txClient = makeTxClient((data) => { captured = data; });
    mockPrisma.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown) => fn(txClient));
    mockLoadEnabledAdapters.mockResolvedValueOnce([
      { providerId: "khuongfb", buyProduct: vi.fn().mockResolvedValue({ externalOrderId: "ext-order-2", data: {} }) },
    ]);
    mockPrisma.order.update.mockResolvedValueOnce({});

    const result = await purchaseKhuongfbProduct({
      userId: USER_ID,
      externalProductId: PRODUCT_ID,
      quantity: 2,
      idempotencyKey: "idem-key-xyz",
    });

    expect(result.finalPrice).toBe(100_000);
    expect(captured?.originalPrice.toNumber()).toBe(100_000);
    expect(captured?.finalPrice.toNumber()).toBe(100_000);
  });
});
