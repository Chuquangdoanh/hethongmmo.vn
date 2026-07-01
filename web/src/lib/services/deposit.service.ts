import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import type { TxType, Transaction } from "@prisma/client";
import { DuplicateError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import { sendTelegramAlert, escTelegramHtml } from "@/lib/services/telegram-alert.service";

interface DepositParams {
  userId: string;
  amount: number;
  referenceCode: string;
  description: string;
  type: Extract<TxType, "DEPOSIT_AUTO" | "DEPOSIT_MANUAL">;
  metadata?: Record<string, string | number | boolean>;
  transactionDate?: string;
  accountNumber?: string;
}

/**
 * Atomically credits a user's balance and creates a transaction record.
 * Idempotent: throws DuplicateError if referenceCode already processed.
 */
export async function processDeposit(params: DepositParams): Promise<Transaction> {
  const { userId, amount, referenceCode, description, type, metadata, transactionDate, accountNumber } = params;

  // Idempotency — check before taking any lock
  const existing = await prisma.transaction.findUnique({
    where: { referenceCode },
    select: { id: true },
  });
  if (existing) {
    throw new DuplicateError("referenceCode", referenceCode);
  }

  const depositAmount = new Decimal(amount);

  const result = await prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE — prevents concurrent deposits to the same user
    const rows = await tx.$queryRaw<Array<{ balance: string; total_deposited: string }>>`
      SELECT balance, total_deposited FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new NotFoundError("User");

    const balanceBefore = new Decimal(row.balance);
    const balanceAfter = balanceBefore.add(depositAmount);
    const newTotalDeposited = new Decimal(row.total_deposited).add(depositAmount);

    await tx.$executeRaw`
      UPDATE users
      SET balance         = ${balanceAfter.toFixed(2)}::numeric,
          total_deposited = ${newTotalDeposited.toFixed(2)}::numeric,
          updated_at      = now()
      WHERE id = ${userId}::uuid
    `;

    let transaction: Awaited<ReturnType<typeof tx.transaction.create>>;
    try {
      transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          amount: depositAmount.toFixed(2),
          description,
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          referenceCode,
          metadata: metadata ?? undefined,
          transactionDate: transactionDate ?? undefined,
          accountNumber: accountNumber ?? undefined,
        },
      });
    } catch (err) {
      // P2002 = unique constraint violation — referenceCode đã được xử lý bởi request song song
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002") {
        throw new DuplicateError("referenceCode", referenceCode);
      }
      throw err;
    }

    await tx.auditLog.create({
      data: {
        actorId: type === "DEPOSIT_MANUAL" ? metadata?.adminId as string ?? null : null,
        action: type,
        targetType: "User",
        targetId: userId,
        before: { balance: balanceBefore.toFixed(2) },
        after: { balance: balanceAfter.toFixed(2) },
        metadata: metadata ?? undefined,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Nạp tiền thành công",
        body: `${description}. Số dư mới: ${balanceAfter.toFixed(0)}đ`,
        type: "DEPOSIT",
        meta: { amount: depositAmount.toFixed(2), referenceCode },
      },
    });

    return transaction;
  });

  logger.info({ userId, amount, referenceCode, type }, "Deposit processed");

  sendTelegramAlert(
    [
      `💰 <b>Nạp tiền thành công</b>`,
      ``,
      `👤 User: <code>${escTelegramHtml(userId)}</code>`,
      `💵 Số tiền: <b>${depositAmount.toFixed(0)}đ</b>`,
      `📝 ${escTelegramHtml(description)}`,
    ].join("\n"),
  );

  return result;
}
