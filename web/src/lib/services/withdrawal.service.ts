import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { getSellerTierConfig } from "@/lib/services/seller.service";
import { SELLER_ESCROW_MINIMUM } from "@/lib/services/wallet.service";
import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import { notifySellerWithdrawalStatus } from "@/lib/services/telegram-alert.service";

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

  const result = await prisma.$transaction(async (tx) => {
    // Verify seller and lock row
    const userRows = await tx.$queryRaw<
      Array<{
        balance: string;
        seller_escrow: string;
        seller_escrow_required: string;
        bank_name_enc: Buffer | null;
        bank_account_number_enc: Buffer | null;
        bank_account_holder_enc: Buffer | null;
        seller_status: string;
        seller_tier: string;
        seller_reverify_required: boolean;
        seller_reverify_approved: boolean;
      }>
    >`
      SELECT balance, seller_escrow, seller_escrow_required, bank_name_enc, bank_account_number_enc, bank_account_holder_enc, seller_status, seller_tier, seller_reverify_required, seller_reverify_approved
      FROM users WHERE id = ${sellerId}::uuid FOR UPDATE
    `;
    const user = userRows[0];
    if (!user) throw new NotFoundError("User");
    if (user.seller_status !== "APPROVED") {
      throw new ValidationError("Tài khoản chưa được duyệt làm seller");
    }

    // Admin có thể yêu cầu seller cụ thể xác minh lại danh tính trước khi rút tiền
    if (user.seller_reverify_required && !user.seller_reverify_approved) {
      throw new ValidationError(
        "Tài khoản của bạn cần xác minh lại danh tính (CCCD/CMND + ảnh chân dung) trước khi rút tiền. " +
        "Vui lòng vào Ví Seller → Rút tiền để nộp ảnh xác minh.",
      );
    }

    // Kiểm tra ký quỹ tối thiểu — theo mức riêng của seller (admin có thể nâng cao hơn mặc định)
    const sellerEscrow = Number(user.seller_escrow ?? 0);
    const escrowRequired = Number(user.seller_escrow_required ?? SELLER_ESCROW_MINIMUM);
    if (sellerEscrow < escrowRequired) {
      throw new ValidationError(
        `Bạn cần ký quỹ tối thiểu ${escrowRequired.toLocaleString("vi")}đ để được rút tiền. ` +
        `Ký quỹ hiện tại: ${sellerEscrow.toLocaleString("vi")}đ. ` +
        `Vui lòng vào Ví Seller → Ký quỹ để nạp thêm.`,
      );
    }

    const tierKey = user.seller_tier ?? "STANDARD";
    const tierCfg = await getSellerTierConfig(tierKey);
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

  let notifySellerId = "";
  let notifyNetAmount = "0";

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
    notifySellerId = withdrawal.sellerId;
    notifyNetAmount = withdrawal.netAmount.toString();
    if (withdrawal.status !== "PENDING") {
      throw new ValidationError(`Yêu cầu đã ở trạng thái ${withdrawal.status}`);
    }

    if (approve) {
      const orderIds = withdrawal.qualifyingOrderIds as string[];

      // Đánh dấu đơn đã rút — đây chính là "trừ doanh số có thể rút".
      // Doanh số seller theo dõi qua đơn hàng (cờ withdrawn), KHÔNG qua ví balance,
      // nên duyệt rút không đụng tới balance của seller.
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { withdrawn: true },
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

  notifySellerWithdrawalStatus(notifySellerId, approve ? "APPROVED" : "REJECTED", notifyNetAmount, rejectReason);
}

interface CompleteWithdrawalParams {
  withdrawalId: string;
  adminUserId: string;
}

/** Admin confirms bank transfer completed. Moves APPROVED → COMPLETED. */
export async function completeWithdrawal(params: CompleteWithdrawalParams): Promise<void> {
  const { withdrawalId, adminUserId } = params;

  let notifySellerId = "";
  let notifyNetAmount = "0";

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.sellerWithdrawal.findUnique({
      where: { id: withdrawalId },
      select: { id: true, sellerId: true, netAmount: true, status: true },
    });

    if (!withdrawal) throw new NotFoundError("Withdrawal");
    notifySellerId = withdrawal.sellerId;
    notifyNetAmount = withdrawal.netAmount.toString();
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

  notifySellerWithdrawalStatus(notifySellerId, "COMPLETED", notifyNetAmount);
}
