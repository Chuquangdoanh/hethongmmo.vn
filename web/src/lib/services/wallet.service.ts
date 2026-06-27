import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { InsufficientBalanceError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

// Mức ký quỹ tối thiểu để seller được phép rút tiền bán hàng
export const SELLER_ESCROW_MINIMUM = 1_000_000;

interface DepositEscrowParams {
  sellerId: string;
  amount: number;
}

/**
 * Chuyển tiền từ balance của seller sang ký quỹ (sellerEscrow).
 * Tiền ký quỹ KHÔNG thể rút — chỉ có thể nạp thêm.
 * Yêu cầu sellerEscrow >= SELLER_ESCROW_MINIMUM để được rút tiền bán hàng.
 */
export async function depositSellerEscrow({ sellerId, amount }: DepositEscrowParams) {
  if (amount <= 0) throw new ValidationError("Số tiền ký quỹ phải lớn hơn 0");

  await prisma.$transaction(async (tx) => {
    const userRows = await tx.$queryRaw<
      Array<{ balance: string; seller_escrow: string; seller_status: string }>
    >`
      SELECT balance, seller_escrow, seller_status
      FROM users WHERE id = ${sellerId}::uuid FOR UPDATE
    `;

    const user = userRows[0];
    if (!user) throw new NotFoundError("User");
    if (user.seller_status !== "APPROVED") {
      throw new ValidationError("Chỉ seller đã được duyệt mới có thể nạp ký quỹ");
    }

    const currentBalance = new Decimal(user.balance);
    const depositAmount  = new Decimal(amount);

    if (currentBalance.lt(depositAmount)) {
      throw new InsufficientBalanceError(currentBalance.toNumber(), depositAmount.toNumber());
    }

    await tx.$executeRaw`
      UPDATE users
      SET balance       = balance       - ${depositAmount.toFixed(2)}::numeric,
          seller_escrow = seller_escrow + ${depositAmount.toFixed(2)}::numeric,
          updated_at    = now()
      WHERE id = ${sellerId}::uuid
    `;

    await tx.transaction.create({
      data: {
        userId:        sellerId,
        type:          "ESCROW_DEPOSIT",
        amount:        depositAmount.neg().toFixed(2),
        description:   `Nạp ký quỹ seller ${amount.toLocaleString("vi")}đ`,
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter:  currentBalance.sub(depositAmount).toFixed(2),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId:    sellerId,
        action:     "ESCROW_DEPOSIT",
        targetType: "User",
        targetId:   sellerId,
        metadata: {
          amount:        depositAmount.toFixed(2),
          balanceBefore: currentBalance.toFixed(2),
          escrowBefore:  user.seller_escrow,
        },
      },
    });
  });

  logger.info({ sellerId, amount }, "Seller escrow deposited");
}
