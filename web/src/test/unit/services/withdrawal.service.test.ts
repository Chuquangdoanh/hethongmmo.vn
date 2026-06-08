import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

vi.mock("@/lib/services/seller.service", () => ({
  getSellerTierConfig: vi.fn().mockResolvedValue({
    fee_percent: 5,
    min_withdrawal: 200_000,
    hold_days: 3,
  }),
}));

vi.mock("@/lib/security/encryption", () => ({
  encrypt: vi.fn().mockReturnValue(Buffer.from("encrypted")),
  decrypt: vi.fn().mockReturnValue("plain-bank-info"),
}));

import { requestWithdrawal, processWithdrawal } from "@/lib/services/withdrawal.service";
import { prisma } from "@/lib/db/prisma";
import { InsufficientBalanceError, ValidationError, NotFoundError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

const SELLER_ID = "seller-0000-0000-0000-000000000001";
const ADMIN_ID  = "admin-0000-0000-0000-000000000001";
const ORDER_IDS = ["order-0000-0000-0000-000000000001"];

function makeApprovedSellerRow(balance = "1000000") {
  return [
    {
      balance,
      seller_status: "APPROVED",
      bank_name_enc: Buffer.from("enc"),
      bank_account_number_enc: Buffer.from("enc"),
      bank_account_holder_enc: Buffer.from("enc"),
    },
  ];
}

function makeQualifyingOrders(finalPrice = "500000") {
  return ORDER_IDS.map((id) => ({
    id,
    finalPrice,
    originalPrice: finalPrice,
  }));
}

function makeRequestTxClient(sellerRows: unknown[], orderRows: unknown[] = makeQualifyingOrders()) {
  return {
    $queryRaw: vi.fn().mockResolvedValue(sellerRows),
    $executeRaw: vi.fn().mockResolvedValue(1),
    transaction: { create: vi.fn() },
    sellerWithdrawal: {
      create: vi.fn().mockResolvedValue({ id: "wd-001" }),
      findFirst: vi.fn().mockResolvedValue(null), // no pending withdrawal
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findMany: vi.fn().mockResolvedValue(orderRows),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("requestWithdrawal", () => {
  it("throws ValidationError when orderIds is empty", async () => {
    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: [] }),
    ).rejects.toThrow(ValidationError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws ValidationError when seller not approved", async () => {
    const txClient = makeRequestTxClient([
      { ...makeApprovedSellerRow()[0], seller_status: "PENDING" },
    ]);
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when bank info not set", async () => {
    const txClient = makeRequestTxClient([
      {
        balance: "1000000",
        seller_status: "APPROVED",
        bank_name_enc: null,
        bank_account_number_enc: null,
        bank_account_holder_enc: null,
      },
    ]);
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when a pending withdrawal already exists", async () => {
    const txClient = makeRequestTxClient(makeApprovedSellerRow());
    txClient.sellerWithdrawal.findFirst = vi.fn().mockResolvedValue({ id: "existing-wd" });
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when no qualifying orders found", async () => {
    const txClient = makeRequestTxClient(makeApprovedSellerRow(), []); // no orders returned
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when order total is below minimum (200,000đ)", async () => {
    const txClient = makeRequestTxClient(
      makeApprovedSellerRow(),
      [{ id: ORDER_IDS[0], finalPrice: "100000", originalPrice: "100000" }],
    );
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    await expect(
      requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS }),
    ).rejects.toThrow(ValidationError);
  });

  it("calculates 5% fee correctly and returns netAmount", async () => {
    const txClient = makeRequestTxClient(
      makeApprovedSellerRow(),
      [{ id: ORDER_IDS[0], finalPrice: "1000000", originalPrice: "1000000" }],
    );
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => fn(txClient),
    );

    const result = await requestWithdrawal({ sellerId: SELLER_ID, orderIds: ORDER_IDS });

    // 5% fee on 1,000,000 = 50,000 → net = 950,000
    expect(result.netAmount).toBe("950000.00");
    expect(result.feeAmount).toBe("50000.00");
    expect(result.feePercent).toBe(5);
  });
});

describe("processWithdrawal", () => {
  it("throws NotFoundError when withdrawal not found", async () => {
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => {
        const txClient = {
          $queryRaw: vi.fn(),
          $executeRaw: vi.fn(),
          transaction: { create: vi.fn() },
          sellerWithdrawal: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
          order: { updateMany: vi.fn() },
          auditLog: { create: vi.fn() },
          notification: { create: vi.fn() },
        };
        return fn(txClient);
      },
    );

    await expect(
      processWithdrawal({ withdrawalId: "wd-999", adminUserId: ADMIN_ID, approve: true }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when withdrawal is not PENDING", async () => {
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => {
        const txClient = {
          $queryRaw: vi.fn(),
          $executeRaw: vi.fn(),
          transaction: { create: vi.fn() },
          sellerWithdrawal: {
            findUnique: vi.fn().mockResolvedValue({
              id: "wd-001", sellerId: SELLER_ID, amount: "500000",
              netAmount: "475000", status: "APPROVED", qualifyingOrderIds: [],
            }),
            update: vi.fn(),
          },
          order: { updateMany: vi.fn() },
          auditLog: { create: vi.fn() },
          notification: { create: vi.fn() },
        };
        return fn(txClient);
      },
    );

    await expect(
      processWithdrawal({ withdrawalId: "wd-001", adminUserId: ADMIN_ID, approve: false }),
    ).rejects.toThrow(ValidationError);
  });

  it("approve: marks orders withdrawn, deducts balance, writes audit", async () => {
    let capturedTx!: ReturnType<typeof makeRequestTxClient>;
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => {
        capturedTx = makeRequestTxClient(makeApprovedSellerRow("2000000"));
        capturedTx.sellerWithdrawal.findUnique = vi.fn().mockResolvedValue({
          id: "wd-001",
          sellerId: SELLER_ID,
          amount: "500000",
          netAmount: "475000",
          status: "PENDING",
          qualifyingOrderIds: ORDER_IDS,
          bankNameEnc: Buffer.from("enc"),
          bankAccountNumberEnc: Buffer.from("enc"),
          bankAccountHolderEnc: Buffer.from("enc"),
        });
        return fn(capturedTx);
      },
    );

    await processWithdrawal({ withdrawalId: "wd-001", adminUserId: ADMIN_ID, approve: true });

    expect(capturedTx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { withdrawn: true } }),
    );
    expect(capturedTx.$executeRaw).toHaveBeenCalledOnce(); // balance deduction
    expect(capturedTx.transaction.create).toHaveBeenCalledOnce();
    expect(capturedTx.sellerWithdrawal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED" }) }),
    );
    expect(capturedTx.auditLog.create).toHaveBeenCalledOnce();
  });

  it("reject: updates status only, no balance changes", async () => {
    let capturedTx!: ReturnType<typeof makeRequestTxClient>;
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => unknown) => {
        capturedTx = makeRequestTxClient(makeApprovedSellerRow());
        capturedTx.sellerWithdrawal.findUnique = vi.fn().mockResolvedValue({
          id: "wd-002",
          sellerId: SELLER_ID,
          amount: "500000",
          netAmount: "475000",
          status: "PENDING",
          qualifyingOrderIds: ORDER_IDS,
          bankNameEnc: Buffer.from("enc"),
          bankAccountNumberEnc: Buffer.from("enc"),
          bankAccountHolderEnc: Buffer.from("enc"),
        });
        return fn(capturedTx);
      },
    );

    await processWithdrawal({
      withdrawalId: "wd-002",
      adminUserId: ADMIN_ID,
      approve: false,
      rejectReason: "Thông tin ngân hàng không hợp lệ",
    });

    // No balance refund on rejection — orders stay withdrawn=false
    expect(capturedTx.$executeRaw).not.toHaveBeenCalled();
    expect(capturedTx.transaction.create).not.toHaveBeenCalled();
    expect(capturedTx.order.updateMany).not.toHaveBeenCalled();
    expect(capturedTx.sellerWithdrawal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED" }) }),
    );
  });
});
