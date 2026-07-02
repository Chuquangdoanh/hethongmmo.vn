import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { InsufficientBalanceError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

/** Hoa hồng chỉ đủ điều kiện rút sau khi đơn hàng phát sinh (order.createdAt) đủ N ngày. */
export const AFFILIATE_WITHDRAWAL_HOLD_DAYS = 3;

export function affiliateWithdrawalHoldCutoff(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AFFILIATE_WITHDRAWAL_HOLD_DAYS);
  return cutoff;
}

interface AffiliateWithdrawalResult {
  id: string;
  netAmount: string;
}

/**
 * Creates a withdrawal request from ALL qualifying commissions (status=APPROVED,
 * withdrawn=false, order đã phát sinh đủ AFFILIATE_WITHDRAWAL_HOLD_DAYS ngày) —
 * không cho chọn từng khoản, luôn gộp toàn bộ khoản đủ điều kiện vào 1 yêu cầu.
 * Independent from SellerWithdrawal/Order.withdrawn — see affiliate-commission.service.ts
 * for why the two systems must never share qualifying-row state.
 */
export async function requestAffiliateWithdrawal(
  params: { affiliateId: string },
): Promise<AffiliateWithdrawalResult> {
  const { affiliateId } = params;

  const result = await prisma.$transaction(async (tx) => {
    const pending = await tx.affiliateWithdrawal.findFirst({
      where: { affiliateId, status: "PENDING" },
      select: { id: true },
    });
    if (pending) throw new ValidationError("Bạn đã có yêu cầu rút tiền đang chờ duyệt");

    const commissions = await tx.affiliateCommission.findMany({
      where: {
        affiliateId,
        status: "APPROVED",
        withdrawn: false,
        order: { createdAt: { lte: affiliateWithdrawalHoldCutoff() } },
      },
      select: { id: true, amount: true },
    });
    if (commissions.length === 0) {
      throw new ValidationError(
        `Không có hoa hồng nào đủ điều kiện rút (đơn hàng phải phát sinh trên ${AFFILIATE_WITHDRAWAL_HOLD_DAYS} ngày)`,
      );
    }

    const commissionIds = commissions.map((c) => c.id);
    const netAmount = commissions.reduce((sum, c) => sum.add(c.amount), new Decimal(0));

    const withdrawal = await tx.affiliateWithdrawal.create({
      data: {
        affiliateId,
        amount: netAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        qualifyingCommissionIds: commissionIds,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: affiliateId,
        action: "AFFILIATE_WITHDRAWAL_REQUESTED",
        targetType: "AffiliateWithdrawal",
        targetId: withdrawal.id,
        metadata: { netAmount: netAmount.toFixed(2), commissionCount: commissions.length },
      },
    });

    return { id: withdrawal.id, netAmount: netAmount.toFixed(2) };
  });

  logger.info({ affiliateId }, "Affiliate withdrawal requested");
  return result;
}

interface ProcessAffiliateWithdrawalParams {
  withdrawalId: string;
  adminUserId: string;
  approve: boolean;
  rejectReason?: string;
}

/** Admin approves or rejects. Approve: marks commissions withdrawn=true and deducts affiliate balance. */
export async function processAffiliateWithdrawal(params: ProcessAffiliateWithdrawalParams): Promise<void> {
  const { withdrawalId, adminUserId, approve, rejectReason } = params;

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.affiliateWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status !== "PENDING") {
      throw new ValidationError(`Yêu cầu đã ở trạng thái ${withdrawal.status}`);
    }

    if (approve) {
      const commissionIds = withdrawal.qualifyingCommissionIds as string[];

      await tx.affiliateCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: { withdrawn: true },
      });

      const affiliateRows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance::text FROM users WHERE id = ${withdrawal.affiliateId}::uuid FOR UPDATE
      `;
      const balanceBefore = new Decimal(affiliateRows[0]?.balance ?? "0");
      const deductAmount = new Decimal(withdrawal.amount.toString());
      if (balanceBefore.lt(deductAmount)) {
        throw new InsufficientBalanceError(balanceBefore.toNumber(), deductAmount.toNumber());
      }
      const balanceAfter = balanceBefore.sub(deductAmount);

      await tx.$executeRaw`
        UPDATE users SET balance = ${balanceAfter.toFixed(2)}::numeric, updated_at = now()
        WHERE id = ${withdrawal.affiliateId}::uuid
      `;

      await tx.transaction.create({
        data: {
          userId: withdrawal.affiliateId,
          type: "AFFILIATE_WITHDRAWAL_FEE",
          amount: deductAmount.neg().toFixed(2),
          description: `Rút hoa hồng affiliate — ${commissionIds.length} khoản`,
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
        },
      });

      await tx.affiliateWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: "APPROVED", processedByUserId: adminUserId, processedAt: new Date() },
      });
    } else {
      await tx.affiliateWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: "REJECTED", rejectReason, processedByUserId: adminUserId, processedAt: new Date() },
      });
    }

    await tx.notification.create({
      data: {
        userId: withdrawal.affiliateId,
        title: approve ? "Yêu cầu rút hoa hồng được duyệt" : "Yêu cầu rút hoa hồng bị từ chối",
        body: approve
          ? `Yêu cầu rút ${Number(withdrawal.netAmount).toLocaleString("vi")}đ đã được chấp thuận.`
          : `Yêu cầu rút tiền bị từ chối. Lý do: ${rejectReason ?? ""}`,
        type: "WITHDRAWAL_STATUS",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: approve ? "AFFILIATE_WITHDRAWAL_APPROVED" : "AFFILIATE_WITHDRAWAL_REJECTED",
        targetType: "AffiliateWithdrawal",
        targetId: withdrawalId,
        before: { status: "PENDING" },
        after: approve ? { status: "APPROVED" } : { status: "REJECTED", rejectReason: rejectReason ?? null },
      },
    });
  });

  logger.info({ withdrawalId, adminUserId, approve }, approve ? "Affiliate withdrawal approved" : "Affiliate withdrawal rejected");
}

/** Admin confirms bank transfer completed. Moves APPROVED → COMPLETED. */
export async function completeAffiliateWithdrawal(withdrawalId: string, adminUserId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.affiliateWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status !== "APPROVED") {
      throw new ValidationError(`Chỉ có thể hoàn thành yêu cầu ở trạng thái APPROVED, hiện tại: ${withdrawal.status}`);
    }

    await tx.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: { status: "COMPLETED", processedAt: new Date(), processedByUserId: adminUserId },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.affiliateId,
        title: "Rút hoa hồng hoàn thành",
        body: `Đã chuyển khoản ${Number(withdrawal.netAmount).toLocaleString("vi")}đ thành công.`,
        type: "WITHDRAWAL_STATUS",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "AFFILIATE_WITHDRAWAL_COMPLETED",
        targetType: "AffiliateWithdrawal",
        targetId: withdrawalId,
        before: { status: "APPROVED" },
        after: { status: "COMPLETED" },
      },
    });
  });

  logger.info({ withdrawalId, adminUserId }, "Affiliate withdrawal completed");
}
