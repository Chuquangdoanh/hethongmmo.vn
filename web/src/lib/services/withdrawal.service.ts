import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { getSellerConfig, getSellerTierConfig } from "@/lib/services/seller.service";
import type { SellerTierKey } from "@/lib/services/seller.service";
import {
  InsufficientBalanceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

interface RequestWithdrawalParams {
  sellerId: string;
  orderIds: string[];
  ip?: string;
}

interface WithdrawalResult {
  id: string;
  netAmount: string;
  feeAmount: string;
  feePercent: number;
}

/**
 * Creates a withdrawal request based on qualifying order IDs.
 * Balance is NOT deducted at request time — deducted on admin approval.
 */
export async function requestWithdrawal(
  params: RequestWithdrawalParams,
): Promise<WithdrawalResult> {
  const { sellerId, orderIds, ip } = params;

  if (!orderIds.length) {
    throw new ValidationError("Không có đơn hàng nào để rút");
  }

  const config = await getSellerConfig();

  const result = await prisma.$transaction(async (tx) => {
    // Verify seller and lock row
    const userRows = await tx.$queryRaw<
      Array<{
        balance: string;
        bank_name_enc: Buffer | null;
        bank_account_number_enc: Buffer | null;
        bank_account_holder_enc: Buffer | null;
        seller_status: string;
        seller_tier: string;
      }>
    >`
      SELECT balance, bank_name_enc, bank_account_number_enc, bank_account_holder_enc, seller_status, seller_tier
      FROM users WHERE id = ${sellerId}::uuid FOR UPDATE
    `;
    const user = userRows[0];
    if (!user) throw new NotFoundError("User");
    if (user.seller_status !== "APPROVED") {
      throw new ValidationError("Tài khoản chưa được duyệt làm seller");
    }

    const tierKey = (user.seller_tier ?? "STANDARD") as SellerTierKey;
    const tierCfg = getSellerTierConfig(config, tierKey);
    const feePercent = tierCfg.fee_percent;
    const minAmount = tierCfg.min_withdrawal;
    const holdDays = tierCfg.hold_days;
    if (!user.bank_name_enc || !user.bank_account_number_enc || !user.bank_account_holder_enc) {
      throw new ValidationError("Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền (liên hệ admin)");
    }

    // Block if a pending withdrawal already exists
    const pending = await tx.sellerWithdrawal.findFirst({
      where: { sellerId, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      throw new ValidationError("Bạn đã có yêu cầu rút tiền đang chờ duyệt");
    }

    // Validate qualifying orders (re-check server-side)
    const holdDate = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000);
    const orders = await tx.order.findMany({
      where: {
        id: { in: orderIds },
        sellerId,
        status: "DONE",
        withdrawn: false,
        createdAt: { lt: holdDate },
      },
      select: { id: true, finalPrice: true, originalPrice: true },
    });

    if (orders.length === 0) {
      throw new ValidationError("Không có đơn hàng nào đủ điều kiện rút tiền");
    }
    if (orders.length !== orderIds.length) {
      throw new ValidationError("Một số đơn hàng không còn đủ điều kiện — vui lòng tải lại trang");
    }

    const grossAmount = orders.reduce(
      (sum, o) => sum.add(o.finalPrice ?? o.originalPrice),
      new Decimal(0),
    );

    if (grossAmount.lt(minAmount)) {
      throw new ValidationError(
        `Số tiền rút tối thiểu là ${minAmount.toLocaleString("vi")}đ`,
      );
    }

    const feeAmount = grossAmount.mul(feePercent).div(100).toDecimalPlaces(0);
    const netAmount = grossAmount.sub(feeAmount);

    const withdrawal = await tx.sellerWithdrawal.create({
      data: {
        sellerId,
        amount: grossAmount.toFixed(2),
        feePercent,
        feeAmount: feeAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        qualifyingOrderIds: orderIds,
        bankNameEnc: user.bank_name_enc as unknown as Uint8Array<ArrayBuffer>,
        bankAccountNumberEnc: user.bank_account_number_enc as unknown as Uint8Array<ArrayBuffer>,
        bankAccountHolderEnc: user.bank_account_holder_enc as unknown as Uint8Array<ArrayBuffer>,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: sellerId,
        action: "WITHDRAWAL_REQUESTED",
        targetType: "SellerWithdrawal",
        targetId: withdrawal.id,
        metadata: {
          amount: grossAmount.toFixed(2),
          feePercent,
          netAmount: netAmount.toFixed(2),
          orderCount: orders.length,
          ip: ip ?? "unknown",
          tier: tierKey,
        },
      },
    });

    return { id: withdrawal.id, netAmount: netAmount.toFixed(2), feeAmount: feeAmount.toFixed(2), feePercent };
  });

  logger.info({ sellerId, orderCount: orderIds.length, netAmount: result.netAmount }, "Withdrawal requested");
  return result;
}

interface ProcessWithdrawalParams {
  withdrawalId: string;
  adminUserId: string;
  approve: boolean;
  rejectReason?: string;
}

/** Admin approves or rejects a withdrawal.
 * Approve: marks qualifying orders as withdrawn=true and deducts seller balance.
 * Reject: status → REJECTED only; orders stay withdrawn=false so seller can re-request.
 */
export async function processWithdrawal(
  params: ProcessWithdrawalParams,
): Promise<void> {
  const { withdrawalId, adminUserId, approve, rejectReason } = params;

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.sellerWithdrawal.findUnique({
      where: { id: withdrawalId },
      select: {
        id: true,
        sellerId: true,
        amount: true,
        netAmount: true,
        status: true,
        qualifyingOrderIds: true,
        bankNameEnc: true,
        bankAccountNumberEnc: true,
        bankAccountHolderEnc: true,
      },
    });

    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status !== "PENDING") {
      throw new ValidationError(`Yêu cầu đã ở trạng thái ${withdrawal.status}`);
    }

    if (approve) {
      const orderIds = withdrawal.qualifyingOrderIds as string[];

      // Mark all qualifying orders as withdrawn
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { withdrawn: true },
      });

      // Deduct seller balance (the SELLER_PAYOUT was credited when orders completed)
      const userRows = await tx.$queryRaw<Array<{ balance: string }>>`
        SELECT balance FROM users WHERE id = ${withdrawal.sellerId}::uuid FOR UPDATE
      `;
      const currentBalance = new Decimal(userRows[0]?.balance ?? "0");
      const deductAmount = new Decimal(withdrawal.amount.toString());

      if (currentBalance.lt(deductAmount)) {
        throw new InsufficientBalanceError(currentBalance.toNumber(), deductAmount.toNumber());
      }

      await tx.$executeRaw`
        UPDATE users
        SET balance = balance - ${deductAmount.toFixed(2)}::numeric, updated_at = now()
        WHERE id = ${withdrawal.sellerId}::uuid
      `;

      await tx.transaction.create({
        data: {
          userId: withdrawal.sellerId,
          type: "WITHDRAWAL_FEE",
          amount: deductAmount.neg().toFixed(2),
          description: `Rút tiền duyệt — ${orderIds.length} đơn hàng`,
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: currentBalance.sub(deductAmount).toFixed(2),
        },
      });

      await tx.sellerWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: "APPROVED", processedByUserId: adminUserId, processedAt: new Date() },
      });
    } else {
      // Reject: orders stay withdrawn=false — seller can re-request
      await tx.sellerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "REJECTED",
          rejectReason,
          processedByUserId: adminUserId,
          processedAt: new Date(),
        },
      });
    }

    await tx.notification.create({
      data: {
        userId: withdrawal.sellerId,
        title: approve ? "Yêu cầu rút tiền được duyệt" : "Yêu cầu rút tiền bị từ chối",
        body: approve
          ? `Yêu cầu rút ${Number(withdrawal.netAmount).toLocaleString("vi")}đ đã được chấp thuận. Admin sẽ chuyển khoản cho bạn.`
          : `Yêu cầu rút tiền bị từ chối. Bạn có thể gửi yêu cầu mới. Lý do: ${rejectReason ?? ""}`,
        type: "WITHDRAWAL_STATUS",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: approve ? "WITHDRAWAL_APPROVED" : "WITHDRAWAL_REJECTED",
        targetType: "SellerWithdrawal",
        targetId: withdrawalId,
        before: { status: "PENDING" },
        after: approve
          ? { status: "APPROVED" }
          : { status: "REJECTED", rejectReason: rejectReason ?? null },
        metadata: { approve, rejectReason: rejectReason ?? null },
      },
    });
  });

  logger.info(
    { withdrawalId, adminUserId, approve },
    approve ? "Withdrawal approved" : "Withdrawal rejected",
  );
}

interface CompleteWithdrawalParams {
  withdrawalId: string;
  adminUserId: string;
}

/** Admin confirms bank transfer completed. Moves APPROVED → COMPLETED. */
export async function completeWithdrawal(params: CompleteWithdrawalParams): Promise<void> {
  const { withdrawalId, adminUserId } = params;

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.sellerWithdrawal.findUnique({
      where: { id: withdrawalId },
      select: { id: true, sellerId: true, netAmount: true, status: true },
    });

    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status !== "APPROVED") {
      throw new ValidationError(`Chỉ có thể hoàn thành yêu cầu ở trạng thái APPROVED, hiện tại: ${withdrawal.status}`);
    }

    await tx.sellerWithdrawal.update({
      where: { id: withdrawalId },
      data: { status: "COMPLETED", processedAt: new Date(), processedByUserId: adminUserId },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.sellerId,
        title: "Rút tiền hoàn thành",
        body: `Đã chuyển khoản ${Number(withdrawal.netAmount).toLocaleString("vi")}đ thành công.`,
        type: "WITHDRAWAL_STATUS",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "WITHDRAWAL_COMPLETED",
        targetType: "SellerWithdrawal",
        targetId: withdrawalId,
        before: { status: "APPROVED" },
        after: { status: "COMPLETED" },
        metadata: { netAmount: withdrawal.netAmount.toString() },
      },
    });
  });

  logger.info({ withdrawalId, adminUserId }, "Withdrawal completed");
}
