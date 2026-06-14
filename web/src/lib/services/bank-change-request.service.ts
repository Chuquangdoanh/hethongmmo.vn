import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { ValidationError, NotFoundError } from "@/lib/errors";
import type { CreateBankChangeRequestInput } from "@/lib/validation/bank-change-request.schema";

export async function submitBankChangeRequest(
  sellerId: string,
  input: CreateBankChangeRequestInput,
) {
  // Chỉ cho phép 1 yêu cầu PENDING tại một thời điểm
  const existing = await prisma.bankChangeRequest.findFirst({
    where: { sellerId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    throw new ValidationError("Bạn đã có yêu cầu đổi thông tin ngân hàng đang chờ duyệt");
  }

  const request = await prisma.bankChangeRequest.create({
    data: {
      sellerId,
      bankNameEnc:          encrypt(input.bankName)          as unknown as Uint8Array<ArrayBuffer>,
      bankAccountNumberEnc: encrypt(input.bankAccountNumber) as unknown as Uint8Array<ArrayBuffer>,
      bankAccountHolderEnc: encrypt(input.bankAccountHolder) as unknown as Uint8Array<ArrayBuffer>,
    },
    select: { id: true, createdAt: true },
  });

  return request;
}

export async function getSellerBankChangeRequests(sellerId: string) {
  const rows = await prisma.bankChangeRequest.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true, status: true, rejectReason: true,
      createdAt: true, reviewedAt: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
    },
  });

  return rows.map((r) => ({
    id:                r.id,
    status:            r.status,
    rejectReason:      r.rejectReason,
    createdAt:         r.createdAt,
    reviewedAt:        r.reviewedAt,
    bankName:          r.bankNameEnc          ? decrypt(r.bankNameEnc          as unknown as Buffer) : null,
    bankAccountNumber: r.bankAccountNumberEnc ? decrypt(r.bankAccountNumberEnc as unknown as Buffer) : null,
    bankAccountHolder: r.bankAccountHolderEnc ? decrypt(r.bankAccountHolderEnc as unknown as Buffer) : null,
  }));
}

export async function reviewBankChangeRequest(
  requestId: string,
  adminId: string,
  action: "approve" | "reject",
  rejectReason?: string,
) {
  const req = await prisma.bankChangeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true, sellerId: true, status: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
    },
  });
  if (!req) throw new NotFoundError("Yêu cầu đổi ngân hàng");
  if (req.status !== "PENDING") {
    throw new ValidationError("Yêu cầu này đã được xử lý");
  }

  if (action === "approve") {
    // Cập nhật thông tin ngân hàng trên User và đổi trạng thái request trong 1 transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.sellerId },
        data: {
          bankNameEnc:          req.bankNameEnc          as unknown as Uint8Array<ArrayBuffer>,
          bankAccountNumberEnc: req.bankAccountNumberEnc as unknown as Uint8Array<ArrayBuffer>,
          bankAccountHolderEnc: req.bankAccountHolderEnc as unknown as Uint8Array<ArrayBuffer>,
        },
      }),
      prisma.bankChangeRequest.update({
        where: { id: requestId },
        data: {
          status:          "APPROVED",
          reviewedByUserId: adminId,
          reviewedAt:      new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId:    adminId,
        action:     "BANK_CHANGE_REQUEST_APPROVED",
        targetType: "BankChangeRequest",
        targetId:   requestId,
        after:      { sellerId: req.sellerId },
      },
    });
  } else {
    await prisma.bankChangeRequest.update({
      where: { id: requestId },
      data: {
        status:           "REJECTED",
        rejectReason:     rejectReason ?? "Không hợp lệ",
        reviewedByUserId: adminId,
        reviewedAt:       new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId:    adminId,
        action:     "BANK_CHANGE_REQUEST_REJECTED",
        targetType: "BankChangeRequest",
        targetId:   requestId,
        after:      { rejectReason: rejectReason ?? null },
      },
    });
  }
}

export async function getPendingBankChangeRequestsForSeller(sellerId: string) {
  const rows = await prisma.bankChangeRequest.findMany({
    where: { sellerId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, createdAt: true,
      bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true,
    },
  });

  return rows.map((r) => ({
    id:                r.id,
    status:            r.status,
    createdAt:         r.createdAt,
    bankName:          r.bankNameEnc          ? decrypt(r.bankNameEnc          as unknown as Buffer) : null,
    bankAccountNumber: r.bankAccountNumberEnc ? decrypt(r.bankAccountNumberEnc as unknown as Buffer) : null,
    bankAccountHolder: r.bankAccountHolderEnc ? decrypt(r.bankAccountHolderEnc as unknown as Buffer) : null,
  }));
}
