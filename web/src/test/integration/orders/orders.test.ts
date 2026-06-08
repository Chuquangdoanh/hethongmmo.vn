import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
    tutTrick: { findUnique: vi.fn() },
    mmoProduct: { findUnique: vi.fn() },
    sellerProduct: { findUnique: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@/lib/services/purchase.service", () => ({ purchaseProduct: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({
  apiRatelimit: {},
  orderRatelimit: null,
  checkRateLimit: vi.fn(),
}));

import { GET, POST } from "@/app/api/orders/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { purchaseProduct } from "@/lib/services/purchase.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { InsufficientBalanceError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
const mockPurchase = purchaseProduct as ReturnType<typeof vi.fn>;

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
  // Use a plain object instead of NextRequest to avoid nextUrl initialization
  // issues in Node.js test environments outside of a Next.js server context.
  return {
    nextUrl: new URL(`http://localhost/api/orders${params}`),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Explicitly re-establish persistent mock implementations after clearAllMocks,
  // because Vitest ESM mock behavior on Linux may clear these between tests.
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 29 });
  vi.mocked(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

describe("GET /api/orders", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns paginated orders for authenticated user", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockPrisma.order.findMany.mockResolvedValueOnce([
      { id: "o1", orderCode: "ORD-001", status: "DONE", itemName: "Test", finalPrice: "50000" },
    ]);
    mockPrisma.order.count.mockResolvedValueOnce(1);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.meta.total).toBe(1);
  });

  it("filters only the authenticated user's orders (IDOR protection)", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeGetRequest());

    const findManyCall = mockPrisma.order.findMany.mock.calls[0]?.[0];
    expect(findManyCall?.where?.userId).toBe(VALID_SESSION.user.id);
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
    mockPrisma.service.findUnique.mockResolvedValueOnce({
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
    mockPurchase.mockResolvedValueOnce({ order: createdOrder });

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.orderCode).toBe("ORD-NEW-01");
    expect(json.data.status).toBe("DONE");
  });

  it("returns 402 on InsufficientBalanceError", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockPrisma.service.findUnique.mockResolvedValueOnce({
      name: "Test",
      price: "50000",
    });
    mockPurchase.mockRejectedValueOnce(new InsufficientBalanceError(10_000, 50_000));

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("returns idempotent response for duplicate idempotencyKey", async () => {
    mockAuth.mockResolvedValueOnce(VALID_SESSION);
    mockPrisma.service.findUnique.mockResolvedValueOnce({ name: "Test", price: "50000" });
    const existingOrder = {
      id: "order-existing",
      orderCode: "ORD-EXIST",
      orderType: "SERVICE",
      itemName: "Test",
      finalPrice: "50000",
      status: "DONE",
    };
    // purchaseProduct returns existing order on dup key (no error)
    mockPurchase.mockResolvedValueOnce({ order: existingOrder });

    const res = await POST(makePostRequest(VALID_PURCHASE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.orderCode).toBe("ORD-EXIST");
  });
});
