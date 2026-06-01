import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    transaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { PATCH } from "@/app/api/admin/users/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

const ADMIN_SESSION = {
  user: {
    id: "admin-0000-0000-0000-000000000001",
    email: "admin@example.com",
    role: "ADMIN",
    name: "Admin User",
  },
};
const USER_SESSION = {
  user: {
    id: "user-0000-0000-0000-000000000001",
    email: "user@example.com",
    role: "USER",
    name: "Regular User",
  },
};

const TARGET_USER_ID = "target-000-0000-0000-000000000001";
const TARGET_USER = {
  id: TARGET_USER_ID,
  role: "USER",
  status: "ACTIVE",
  balance: "500000",
};

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/admin/users/${TARGET_USER_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ id: TARGET_USER_ID });

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/admin/users/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ action: "ban" }) as never, { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(USER_SESSION);
    const res = await PATCH(makeRequest({ action: "ban" }) as never, { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid action schema", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    const res = await PATCH(
      makeRequest({ action: "invalid_action" }) as never,
      { params: PARAMS },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when target user not found", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "ban" }) as never, { params: PARAMS });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("bans a user and writes audit log", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(TARGET_USER);
    mockPrisma.user.update.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const res = await PATCH(makeRequest({ action: "ban" }) as never, { params: PARAMS });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      data: { status: "BANNED" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it("unbans a user", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...TARGET_USER, status: "BANNED" });
    mockPrisma.user.update.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const res = await PATCH(makeRequest({ action: "unban" }) as never, { params: PARAMS });
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      data: { status: "ACTIVE" },
    });
  });

  it("prevents admin from banning themselves", async () => {
    const selfParams = Promise.resolve({ id: ADMIN_SESSION.user.id });
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: ADMIN_SESSION.user.id,
      role: "ADMIN",
      status: "ACTIVE",
      balance: "0",
    });

    const res = await PATCH(makeRequest({ action: "ban" }) as never, { params: selfParams });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("FORBIDDEN");
  });

  it("changes user role and writes audit log", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(TARGET_USER);
    mockPrisma.user.update.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const res = await PATCH(
      makeRequest({ action: "change_role", role: "SELLER" }) as never,
      { params: PARAMS },
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      data: { role: "SELLER" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
  });

  it("adjusts balance inside a $transaction with audit log", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(TARGET_USER);

    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => {
        const txClient = {
          user: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: "500000" }),
            update: vi.fn(),
          },
          transaction: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return fn(txClient);
      },
    );

    const res = await PATCH(
      makeRequest({ action: "adjust_balance", amount: 100_000, note: "Test adjustment" }) as never,
      { params: PARAMS },
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("returns 400 when adjust_balance amount is 0", async () => {
    mockAuth.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await PATCH(
      makeRequest({ action: "adjust_balance", amount: 0 }) as never,
      { params: PARAMS },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});
