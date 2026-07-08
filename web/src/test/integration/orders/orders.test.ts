import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Stable mock references via vi.hoisted() ───────────────────────────────────
// vi.hoisted() runs synchronously before all vi.mock() factories, making these
// references available inside factories while avoiding the ESM live-binding
// problem on Linux where an imported named export may be a different object
// than the function actually invoked inside the route module.
const {
  mockAuth,
  mockCheckRateLimit,
  mockPurchaseProduct,
  mockUserFindUnique,
  mockServiceFindUnique,
  mockCourseFindUnique,
  mockTutTrickFindUnique,
  mockMmoProductFindUnique,
  mockSellerProductFindUnique,
  mockOrderFindMany,
  mockOrderCount,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockPurchaseProduct: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockServiceFindUnique: vi.fn(),
  mockCourseFindUnique: vi.fn(),
  mockTutTrickFindUnique: vi.fn(),
  mockMmoProductFindUnique: vi.fn(),
  mockSellerProductFindUnique: vi.fn(),
  mockOrderFindMany: vi.fn(),
  mockOrderCount: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    service: { findUnique: mockServiceFindUnique },
    course: { findUnique: mockCourseFindUnique },
    tutTrick: { findUnique: mockTutTrickFindUnique },
    mmoProduct: { findUnique: mockMmoProductFindUnique },
    sellerProduct: { findUnique: mockSellerProductFindUnique },
    order: { findMany: mockOrderFindMany, count: mockOrderCount },
  },
}));
vi.mock("@/lib/services/purchase.service", () => ({ purchaseProduct: mockPurchaseProduct }));
vi.mock("@/lib/security/rate-limit", () => ({
  apiRatelimit: {},
  orderRatelimit: null,
  checkRateLimit: mockCheckRateLimit,
}));

import { GET, POST } from "@/app/api/orders/route";
import { InsufficientBalanceError } from "@/lib/errors";

const VALID_SESSION = {
  user: { id: "user-0001", email: "user@example.com", role: "USER", name: "Test User" },
};

// UUID v4 format: version bit = 4 (pos 14), variant = 8-b (pos 19)
const VALID_PURCHASE_BODY = {
  itemId: "11111111-1111-4111-8111-111111111111",
  orderType: "SERVICE",
  idempotencyKey: "22222222-2222-4222-8222-222222222222",
};

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

function makeGetRequest(params = ""): NextRequest {
  // Plain object avoids NextRequest.nextUrl initialization issues in Node.js
  // test environments outside a real Next.js server context (Linux CI).
  return {
    nextUrl: new URL(`http://localhost/api/orders${params}`),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default implementations needed on every authenticated request.
  // Using the hoisted references directly — no ESM binding indirection.
  mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 29 });
  mockUserFindUnique.mockResolvedValue(null);
});

describe("GET /api/orders", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns paginated orders for authenticated user", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockOrderFindMany.mockResolvedValueOnce([
      { id: "o1", orderCode: "ORD-001", status: "DONE", itemName: "Test", finalPrice: "50000" },
    ]);
    mockOrderCount.mockResolvedValueOnce(1);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.meta.total).toBe(1);
  });

  it("filters only the authenticated user's orders (IDOR protection)", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockOrderFindMany.mockResolvedValueOnce([]);
    mockOrderCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest());

    const findManyArg = mockOrderFindMany.mock.calls[0]?.[0];
    expect(findManyArg?.where?.userId).toBe(VALID_SESSION.user.id);
  });
});

describe("POST /api/orders", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error (missing fields)", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    const res = await POST(makePostRequest({ orderType: "SERVICE" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on validation error (invalid UUID for itemId)", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    const res = await POST(
      makePostRequest({ ...VALID_PURCHASE_BODY, itemId: "not-a-uuid" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates order successfully and returns 201", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockServiceFindUnique.mockResolvedValueOnce({
      name: "Tăng Like Facebook",
      price: "50000",
    });
    const createdOrder = {
      id: "order-new",
      orderCode: "ORD-NEW-01",
      orderType: "SERVICE",
      itemName: "Tăng Like Facebook",
      finalPrice: "50000",
      status: "DONE",
    };
    mockPurchaseProduct.mockResolvedValueOnce({ order: createdOrder });

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.orderCode).toBe("ORD-NEW-01");
    expect(json.data.status).toBe("DONE");
  });

  it("returns 402 on InsufficientBalanceError", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockServiceFindUnique.mockResolvedValueOnce({
      name: "Test",
      price: "50000",
    });
    mockPurchaseProduct.mockRejectedValueOnce(new InsufficientBalanceError(10_000, 50_000));

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("returns idempotent response for duplicate idempotencyKey", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockServiceFindUnique.mockResolvedValueOnce({ name: "Test", price: "50000" });
    const existingOrder = {
      id: "order-existing",
      orderCode: "ORD-EXIST",
      orderType: "SERVICE",
      itemName: "Test",
      finalPrice: "50000",
      status: "DONE",
    };
    mockPurchaseProduct.mockResolvedValueOnce({ order: existingOrder });

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.orderCode).toBe("ORD-EXIST");
  });

  it("applies agent discount (Đại lý) to MMO_PRODUCT, overriding tier from totalDeposited", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockMmoProductFindUnique.mockResolvedValueOnce({ name: "Tài nguyên Test", price: "100000" });
    mockUserFindUnique.mockResolvedValueOnce({
      discountPercent: 5,
      totalDeposited: "200000000", // đủ điều kiện tier 15%, nhưng Đại lý phải thắng
      agentDiscountPercent: 20,
    });
    mockPurchaseProduct.mockResolvedValueOnce({
      order: {
        id: "order-mmo", orderCode: "ORD-MMO-01", orderType: "MMO_PRODUCT",
        itemName: "Tài nguyên Test", finalPrice: "80000", status: "DONE",
      },
    });

    const res = await POST(makePostRequest({
      itemId: "11111111-1111-4111-8111-111111111111",
      orderType: "MMO_PRODUCT",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    }));

    expect(res.status).toBe(201);
    expect(mockPurchaseProduct).toHaveBeenCalledWith(
      expect.objectContaining({ finalPrice: 80_000, discountPercent: 20 }),
    );
  });

  it("does not apply any discount to SELLER_PRODUCT (freeze: sản phẩm seller không giảm giá)", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockSellerProductFindUnique.mockResolvedValueOnce({ name: "Seller Item", price: "100000" });
    mockUserFindUnique.mockResolvedValueOnce({
      discountPercent: 10,
      totalDeposited: "200000000",
      agentDiscountPercent: 20,
    });
    mockPurchaseProduct.mockResolvedValueOnce({
      order: {
        id: "order-seller", orderCode: "ORD-SELLER-01", orderType: "SELLER_PRODUCT",
        itemName: "Seller Item", finalPrice: "100000", status: "DONE",
      },
    });

    const res = await POST(makePostRequest({
      itemId: "11111111-1111-4111-8111-111111111111",
      orderType: "SELLER_PRODUCT",
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    }));

    expect(res.status).toBe(201);
    expect(mockPurchaseProduct).toHaveBeenCalledWith(
      expect.objectContaining({ finalPrice: 100_000, discountPercent: 0 }),
    );
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
