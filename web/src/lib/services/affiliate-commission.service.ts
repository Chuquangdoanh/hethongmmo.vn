import Decimal from "decimal.js";
import type { Prisma, OrderType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";

type TxClient = Prisma.TransactionClient;

interface OrderForCommission {
  id: string;
  userId: string;
  orderType: OrderType;
  finalPrice: Prisma.Decimal | string | number;
}

/**
 * Resolves the commission % for a given affiliate + order type.
 * Specificity when multiple rules match (highest wins): affiliateId+orderType
 * > affiliateId only > orderType only > global default (neither set).
 */
async function resolveCommissionPercent(tx: TxClient, affiliateId: string, orderType: OrderType): Promise<Decimal | null> {
  const rules = await tx.affiliateCommissionRule.findMany({
    where: {
      isActive: true,
      productId: null,
      categoryId: null,
      AND: [
        { OR: [{ affiliateId }, { affiliateId: null }] },
        { OR: [{ orderType }, { orderType: null }] },
      ],
    },
  });
  if (rules.length === 0) return null;

  const specificity = (r: (typeof rules)[number]) =>
    (r.affiliateId === affiliateId ? 2 : 0) + (r.orderType === orderType ? 1 : 0);

  const best = rules.reduce((top, r) => {
    if (!top) return r;
    const rScore = specificity(r);
    const topScore = specificity(top);
    if (rScore !== topScore) return rScore > topScore ? r : top;
    if (r.priority !== top.priority) return r.priority > top.priority ? r : top;
    return r.createdAt > top.createdAt ? r : top;
  }, rules[0]);

  return best ? new Decimal(best.commissionPercent.toString()) : null;
}

/**
 * Creates a PENDING commission row for an order whose buyer is affiliate-linked.
 * No-op if the buyer has no referrerAffiliateId, no active rule resolves, or a
 * commission for this order already exists (idempotent via orderId unique constraint).
 */
export async function createAffiliateCommission(
  tx: TxClient,
  order: OrderForCommission,
  referrerAffiliateId?: string | null,
): Promise<void> {
  let affiliateId = referrerAffiliateId;
  if (affiliateId === undefined) {
    const buyer = await tx.user.findUnique({
      where: { id: order.userId },
      select: { referrerAffiliateId: true },
    });
    affiliateId = buyer?.referrerAffiliateId ?? null;
  }
  if (!affiliateId) return;

  const existing = await tx.affiliateCommission.findUnique({ where: { orderId: order.id } });
  if (existing) return;

  const percent = await resolveCommissionPercent(tx, affiliateId, order.orderType);
  if (!percent) {
    logger.warn({ orderId: order.id, affiliateId }, "Affiliate linked but no active commission rule configured");
    return;
  }

  const orderAmount = new Decimal(order.finalPrice.toString());
  const amount = orderAmount.mul(percent).div(100).toDecimalPlaces(2);

  try {
    await tx.affiliateCommission.create({
      data: {
        affiliateId,
        customerId: order.userId,
        orderId: order.id,
        orderAmount: orderAmount.toFixed(2),
        commissionPercent: percent.toFixed(2),
        amount: amount.toFixed(2),
        status: "PENDING",
      },
    });
  } catch (err: unknown) {
    // P2002 = unique constraint violation on orderId — already created by a concurrent call, safe no-op
    if (!(err instanceof Error) || !err.message.includes("P2002")) throw err;
  }
}

/**
 * Reverses a commission when its order is cancelled/refunded. If the commission
 * had already been APPROVED (credited to affiliate balance), claws back the
 * balance — allowed to go negative, flagged via voidReason for Admin follow-up.
 */
export async function voidAffiliateCommission(
  tx: TxClient,
  orderId: string,
  reason: string,
): Promise<void> {
  const commission = await tx.affiliateCommission.findUnique({ where: { orderId } });
  if (!commission || commission.status === "VOIDED") return;

  const wasApproved = commission.status === "APPROVED";

  await tx.affiliateCommission.update({
    where: { id: commission.id },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
  });

  if (!wasApproved) return;

  const amount = new Decimal(commission.amount.toString());
  const affiliateRows = await tx.$queryRaw<Array<{ balance: string }>>`
    SELECT balance::text FROM users WHERE id = ${commission.affiliateId}::uuid FOR UPDATE
  `;
  const balanceBefore = new Decimal(affiliateRows[0]?.balance ?? "0");
  const balanceAfter = balanceBefore.sub(amount); // cho phép âm — theo quyết định #3

  await tx.$executeRaw`
    UPDATE users SET balance = ${balanceAfter.toFixed(2)}::numeric, updated_at = now()
    WHERE id = ${commission.affiliateId}::uuid
  `;

  await tx.transaction.create({
    data: {
      userId: commission.affiliateId,
      orderId,
      type: "AFFILIATE_COMMISSION_VOID",
      amount: amount.neg().toFixed(2),
      description: `Hoàn/hủy hoa hồng — ${reason}`,
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
    },
  });

  logger.info({ orderId, affiliateId: commission.affiliateId, amount: amount.toFixed(2) }, "Affiliate commission voided");
}

/** Admin approves a PENDING commission — credits the affiliate's balance. */
export async function approveAffiliateCommission(commissionId: string, adminUserId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const commission = await tx.affiliateCommission.findUnique({ where: { id: commissionId } });
    if (!commission) return;
    if (commission.status !== "PENDING") return;

    const amount = new Decimal(commission.amount.toString());
    const affiliateRows = await tx.$queryRaw<Array<{ balance: string }>>`
      SELECT balance::text FROM users WHERE id = ${commission.affiliateId}::uuid FOR UPDATE
    `;
    const balanceBefore = new Decimal(affiliateRows[0]?.balance ?? "0");
    const balanceAfter = balanceBefore.add(amount);

    await tx.$executeRaw`
      UPDATE users SET balance = ${balanceAfter.toFixed(2)}::numeric, updated_at = now()
      WHERE id = ${commission.affiliateId}::uuid
    `;

    await tx.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: "APPROVED", approvedByUserId: adminUserId, approvedAt: new Date() },
    });

    await tx.transaction.create({
      data: {
        userId: commission.affiliateId,
        orderId: commission.orderId,
        type: "AFFILIATE_COMMISSION",
        amount: amount.toFixed(2),
        description: "Hoa hồng affiliate được duyệt",
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });
  });
}

/** Admin manually voids a PENDING/APPROVED commission (e.g. fraud, policy violation). */
export async function adminVoidAffiliateCommission(commissionId: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const commission = await tx.affiliateCommission.findUnique({ where: { id: commissionId } });
    if (!commission) return;
    await voidAffiliateCommission(tx, commission.orderId, reason);
  });
}
