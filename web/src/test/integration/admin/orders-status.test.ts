import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks — available inside vi.mock() factories below ──────────────
const {
  mockAuth,
  mockHasPermission,
  mockOrderFindUnique,
  mockTransaction,
  mockGetSellerTierConfig,
  mockCreateAffiliateCommission,
  mockVoidAffiliateCommission,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockHasPermission: vi.fn(),
  mockOrderFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetSellerTierConfig: vi.fn(),
  mockCreateAffiliateCommission: vi.fn(),
  mockVoidAffiliateCommission: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: { findUnique: mockOrderFindUnique },
    $transaction: mockTransaction,
  },
}));
vi.mock("@/lib/services/permission.service", () => ({
  hasPermission: mockHasPermission,
  hasAnyPermissionInModule: vi.fn(),
}));
vi.mock("@/lib/services/seller.service", () => ({
  getSellerTierConfig: mockGetSellerTierConfig,
}));
vi.mock("@/lib/services/affiliate-commission.service", () => ({
  createAffiliateCommission: mockCreateAffiliateCommission,
  voidAffiliateCommission: mockVoidAffiliateCommission,
}));
vi.mock("@/lib/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { PATCH } from "@/app/api/admin/orders/[id]/route";

const ADMIN_SESSION = {
  user: { id: "admin-0000-0000-0000-000000000001", email: "admin@example.com", role: "ADMIN", name: "Admin" },
};
const USER_SESSION = {
  user: { id: "user-0000-0000-0000-000000000001", email: "user@example.com", role: "USER", name: "User" },
};

const ORDER_ID = "order-0000-0000-0000-000000000001";
const SELLER_ID = "seller-000-0000-0000-000000000001";
const PARAMS = Promise.resolve({ id: ORDER_ID });

const BASE_ORDER = {
  id: ORDER_ID,
  status: "DONE",
  orderCode: "ORD-0001",
  userId: "buyer-000-0000-0000-000000000001",
  itemName: "Test Item",
  finalPrice: "100000",
  orderType: "SELLER_PRODUCT",
};

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/admin/orders/${ORDER_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Builds a tx mock and wires $transaction to invoke the route's callback with it. */
function setupTx(overrides: {
  lockedOrder: Record<string, unknown> | null;
  sellerUser?: Record<string, unknown> | null;
  sellerBalanceRows?: Array<{ balance: string }>;
}) {
  const tx = {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([]) // lock order FOR UPDATE — return value unused
      .mockResolvedValueOnce(overrides.sellerBalanceRows ?? []), // seller balance lock, if reached
    order: {
      findUnique: vi.fn().mockResolvedValue(overrides.lockedOrder),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(overrides.sellerUser ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    transaction: { create: vi.fn().mockResolvedValue({}) },
    notification: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSellerTierConfig.mockResolvedValue({ hold_days: 3, fee_percent: 5, min_withdrawal: 200_000 });
});

describe("PATCH /api/admin/orders/[id] — auth & validation", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is a plain USER (below STAFF)", async () => {
    mockAuth.mockResolvedValueOnce(USER_SESSION);
    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid status value", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    const res = await PATCH(makeRequest({ status: "NOT_A_STATUS" }) as never, { params: PARAMS });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when order does not exist", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/orders/[id] — normal transitions (no seller money involved)", () => {
  it("marks order DONE — no hold-day check, no seller deduction, creates commission + notification", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce({ ...BASE_ORDER, status: "PROCESSING" });
    const tx = setupTx({ lockedOrder: { status: "PROCESSING", sellerId: SELLER_ID, withdrawn: false, createdAt: new Date(), finalPrice: "100000" } });

    const res = await PATCH(makeRequest({ status: "DONE" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: "DONE", completedAt: expect.any(Date) },
    });
    expect(mockCreateAffiliateCommission).toHaveBeenCalledOnce();
    expect(tx.notification.create).toHaveBeenCalledOnce();
    expect(tx.user.update).not.toHaveBeenCalled(); // no seller balance touched
    expect(mockGetSellerTierConfig).not.toHaveBeenCalled(); // hold-day check skipped entirely
  });

  it("refunds an order that was never DONE (e.g. still PROCESSING) — no hold-day gate, no seller impact", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce({ ...BASE_ORDER, status: "PROCESSING" });
    const tx = setupTx({
      lockedOrder: { status: "PROCESSING", sellerId: SELLER_ID, withdrawn: false, createdAt: new Date(), finalPrice: "100000" },
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: "REFUNDED" },
    });
    expect(mockVoidAffiliateCommission).toHaveBeenCalledOnce();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(mockGetSellerTierConfig).not.toHaveBeenCalled();
  });

  it("does not apply hold-day/claw-back logic when the order has no sellerId (e.g. platform service order)", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: null, withdrawn: false, createdAt: new Date(), finalPrice: "100000" },
    });

    const res = await PATCH(makeRequest({ status: "CANCELLED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: "CANCELLED" } });
    expect(mockGetSellerTierConfig).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/orders/[id] — hold-day gate for DONE orders with a seller", () => {
  it("allows REFUNDED while still within hold day (order created recently)", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: false, createdAt: new Date(), finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: "REFUNDED" } });
    expect(tx.user.update).not.toHaveBeenCalled(); // withdrawn=false → no claw-back needed
  });

  it("blocks REFUNDED once the order is past hold day — order status is NOT changed", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const oldCreatedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago, hold_days=3
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: false, createdAt: oldCreatedAt, finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/quá thời hạn giữ tiền/);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("blocks FROZEN (hủy đơn) the same way once past hold day", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const oldCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: false, createdAt: oldCreatedAt, finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
    });

    const res = await PATCH(makeRequest({ status: "FROZEN" }) as never, { params: PARAMS });

    expect(res.status).toBe(400);
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("respects a higher-tier seller's longer hold_days (e.g. VIP = 7 days) — recent order still blocked if VIP window not yet elapsed is irrelevant; here we confirm the tier value is actually used", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    mockGetSellerTierConfig.mockResolvedValueOnce({ hold_days: 7, fee_percent: 3, min_withdrawal: 500_000 });
    // Created 5 days ago: past a 3-day hold (STANDARD) but still within a 7-day hold (VIP)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: false, createdAt: fiveDaysAgo, finalPrice: "100000" },
      sellerUser: { sellerTier: "VIP" },
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200); // still inside the 7-day VIP hold window → allowed
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: "REFUNDED" } });
  });
});

describe("PATCH /api/admin/orders/[id] — claw-back safety net (withdrawn=true race condition)", () => {
  it("deducts seller balance and logs a COMPLAINT_DEDUCTION transaction when balance is sufficient", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: true, createdAt: new Date(), finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
      sellerBalanceRows: [{ balance: "500000" }],
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: SELLER_ID }, data: { balance: 400_000 } });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: SELLER_ID,
        orderId: ORDER_ID,
        type: "COMPLAINT_DEDUCTION",
        amount: -100_000,
        balanceBefore: 500_000,
        balanceAfter: 400_000,
      }),
    });
    // Order status change still proceeds after a successful claw-back
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: "REFUNDED" } });
    // This route never touches the buyer's balance — no REFUND-type transaction is created
    expect(tx.transaction.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "REFUND" }) }),
    );
  });

  it("blocks the entire request (order status unchanged) when seller balance is insufficient for claw-back", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: true, createdAt: new Date(), finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
      sellerBalanceRows: [{ balance: "30000" }], // less than finalPrice (100000)
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/không đủ để trừ lại/);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled(); // status change rolled back together with the deduction
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it("treats a zero seller balance as insufficient and blocks", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: true, createdAt: new Date(), finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
      sellerBalanceRows: [],
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(400);
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("deducts exactly finalPrice even when seller balance exactly matches it (boundary: equal is sufficient)", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockOrderFindUnique.mockResolvedValueOnce(BASE_ORDER);
    const tx = setupTx({
      lockedOrder: { status: "DONE", sellerId: SELLER_ID, withdrawn: true, createdAt: new Date(), finalPrice: "100000" },
      sellerUser: { sellerTier: "STANDARD" },
      sellerBalanceRows: [{ balance: "100000" }],
    });

    const res = await PATCH(makeRequest({ status: "REFUNDED" }) as never, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: SELLER_ID }, data: { balance: 0 } });
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: "REFUNDED" } });
  });
});
