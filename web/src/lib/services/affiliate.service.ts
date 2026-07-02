import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

type TxClient = Prisma.TransactionClient;

const AFFILIATE_CODE_LENGTH = 6;
const AFFILIATE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm (0/O, 1/I)

function generateAffiliateCodeCandidate(): string {
  const bytes = randomBytes(AFFILIATE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < AFFILIATE_CODE_LENGTH; i++) {
    code += AFFILIATE_CODE_ALPHABET[(bytes[i] ?? 0) % AFFILIATE_CODE_ALPHABET.length];
  }
  return `AFF-${code}`;
}

async function generateUniqueAffiliateCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateAffiliateCodeCandidate();
    const existing = await prisma.user.findUnique({
      where: { affiliateCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new ValidationError("Không thể tạo mã affiliate, vui lòng thử lại");
}

/** Admin grants affiliate access to an existing user account. */
export async function grantAffiliateAccess(userId: string): Promise<{ affiliateCode: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAffiliate: true, affiliateCode: true },
  });
  if (!user) throw new NotFoundError("User");
  if (user.isAffiliate && user.affiliateCode) {
    return { affiliateCode: user.affiliateCode };
  }

  const affiliateCode = await generateUniqueAffiliateCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      isAffiliate: true,
      affiliateStatus: "ACTIVE",
      affiliateCode,
      affiliateJoinedAt: user.affiliateCode ? undefined : new Date(),
    },
  });
  return { affiliateCode };
}

/** Admin locks/unlocks or revokes affiliate access. Does not touch existing referredUsers links. */
export async function updateAffiliateStatus(
  userId: string,
  data: { affiliateStatus?: "ACTIVE" | "LOCKED"; isAffiliate?: boolean },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAffiliate: true } });
  if (!user) throw new NotFoundError("User");
  await prisma.user.update({ where: { id: userId }, data });
}

/**
 * First-touch, permanent link creation. Idempotent — no-op if the customer is
 * already linked, the code doesn't resolve to an active affiliate, or it's a
 * self-referral. Never throws — a bad ?ref= must never break register/login.
 */
export async function linkCustomerToAffiliate(
  tx: TxClient,
  params: { customerId: string; affiliateCodeFromCookie: string | undefined | null },
): Promise<void> {
  const { customerId, affiliateCodeFromCookie } = params;
  if (!affiliateCodeFromCookie) return;

  const customer = await tx.user.findUnique({
    where: { id: customerId },
    select: { referrerAffiliateId: true },
  });
  if (!customer || customer.referrerAffiliateId) return; // đã gắn rồi — first-touch thắng vĩnh viễn

  const affiliate = await tx.user.findFirst({
    where: { affiliateCode: affiliateCodeFromCookie, isAffiliate: true, affiliateStatus: "ACTIVE" },
    select: { id: true },
  });
  if (!affiliate || affiliate.id === customerId) return;

  await tx.user.update({
    where: { id: customerId },
    data: { referrerAffiliateId: affiliate.id, affiliateJoinedAt: new Date() },
  });

  logger.info({ customerId, affiliateId: affiliate.id }, "Customer linked to affiliate (lifetime)");
}

/** Fire-and-forget click tracking — called once per new aff_ref cookie, not per page view. */
export function trackAffiliateClick(params: {
  affiliateCode: string;
  ipAddress?: string;
  userAgent?: string;
  landingPath?: string;
}): void {
  const { affiliateCode, ipAddress, userAgent, landingPath } = params;
  prisma.user
    .findFirst({ where: { affiliateCode, isAffiliate: true }, select: { id: true } })
    .then((affiliate) => {
      if (!affiliate) return;
      return prisma.affiliateClick.create({
        data: { affiliateId: affiliate.id, ipAddress, userAgent, landingPath },
      });
    })
    .catch((err: unknown) => logger.error({ err, affiliateCode }, "Failed to track affiliate click"));
}

export async function getAffiliateStats(affiliateId: string) {
  const [totalClicks, totalCustomers, commissionAgg, orderAgg] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateId } }),
    prisma.user.count({ where: { referrerAffiliateId: affiliateId } }),
    prisma.affiliateCommission.groupBy({
      by: ["status"],
      where: { affiliateId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.affiliateCommission.aggregate({
      where: { affiliateId, status: { not: "VOIDED" } },
      _sum: { orderAmount: true },
      _count: true,
    }),
  ]);

  const byStatus = { PENDING: 0, APPROVED: 0, VOIDED: 0 } as Record<string, number>;
  for (const row of commissionAgg) {
    byStatus[row.status] = Number(row._sum.amount ?? 0);
  }

  return {
    totalClicks,
    totalCustomers,
    totalOrders: orderAgg._count,
    totalRevenue: Number(orderAgg._sum.orderAmount ?? 0),
    commissionPending: byStatus.PENDING ?? 0,
    commissionApproved: byStatus.APPROVED ?? 0,
    commissionVoided: byStatus.VOIDED ?? 0,
  };
}

export function buildReferralLink(affiliateCode: string, baseUrl: string): string {
  return `${baseUrl}/?ref=${affiliateCode}`;
}
