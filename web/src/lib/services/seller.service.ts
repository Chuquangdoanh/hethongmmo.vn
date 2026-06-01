import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { encrypt } from "@/lib/security/encryption";
import {
  InsufficientBalanceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

const SELLER_REGISTRATION_FEE = 50_000;

interface RegisterSellerParams {
  userId: string;
  category: string;
  ip?: string;
}

/** Deducts 50,000đ registration fee and creates a pending seller request. */
export async function registerSeller(params: RegisterSellerParams): Promise<void> {
  const { userId, category, ip } = params;

  await prisma.$transaction(async (tx) => {
    const userRows = await tx.$queryRaw<
      Array<{ balance: string; seller_status: string }>
    >`
      SELECT balance, seller_status FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const user = userRows[0];
    if (!user) throw new NotFoundError("User");

    if (user.seller_status === "APPROVED") {
      throw new ValidationError("Bạn đã là seller được duyệt");
    }
    if (user.seller_status === "PENDING") {
      throw new ValidationError("Yêu cầu của bạn đang chờ xét duyệt");
    }

    const balance = new Decimal(user.balance);
    const fee = new Decimal(SELLER_REGISTRATION_FEE);
    if (balance.lt(fee)) {
      throw new InsufficientBalanceError(balance.toNumber(), fee.toNumber());
    }

    const balanceAfter = balance.sub(fee);

    await tx.$executeRaw`
      UPDATE users
      SET balance = ${balanceAfter.toFixed(2)}::numeric,
          seller_status = 'PENDING',
          updated_at = now()
      WHERE id = ${userId}::uuid
    `;

    await tx.sellerRequest.upsert({
      where: { userId },
      create: { userId, category, fee: fee.toFixed(2) },
      update: { category, fee: fee.toFixed(2), status: "PENDING", rejectReason: null },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: "SELLER_REGISTRATION",
        amount: fee.neg().toFixed(2),
        description: "Phí đăng ký bán hàng",
        balanceBefore: balance.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "SELLER_REGISTRATION_REQUESTED",
        targetType: "SellerRequest",
        targetId: userId,
        metadata: { category, ip: ip ?? "unknown" },
      },
    });
  });

  logger.info({ userId, category }, "Seller registration submitted");
}

interface AddProductParams {
  sellerId: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  sellerCategory: string;
  stockItems: string[];
}

/** Adds a new product with encrypted stock items. Enforces product limit. */
export async function addSellerProduct(params: AddProductParams): Promise<string> {
  const { sellerId, name, price, description, imageUrl, sellerCategory, stockItems } = params;

  const productCount = await checkProductLimit(sellerId);
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { maxSellerProducts: true, sellerStatus: true },
  });

  if (!seller || seller.sellerStatus !== "APPROVED") {
    throw new ValidationError("Tài khoản chưa được duyệt làm seller");
  }
  if (productCount >= seller.maxSellerProducts) {
    throw new ValidationError(
      `Bạn đã đạt giới hạn ${seller.maxSellerProducts} sản phẩm`,
    );
  }
  if (stockItems.length === 0) {
    throw new ValidationError("Cần ít nhất 1 item trong kho");
  }

  // Buffer → Uint8Array<ArrayBuffer> required by Prisma Bytes type
  const encryptedItems = stockItems.map((item) => ({
    contentEnc: encrypt(item) as unknown as Uint8Array<ArrayBuffer>,
  }));

  const product = await prisma.sellerProduct.create({
    data: {
      sellerId,
      sellerCategory,
      name,
      price: new Decimal(price).toFixed(2),
      description,
      imageUrl,
      stockItems: {
        create: encryptedItems.map((item) => ({ contentEnc: item.contentEnc })),
      },
    },
    select: { id: true },
  });

  logger.info({ sellerId, productId: product.id, stockCount: stockItems.length }, "Product added");
  return product.id;
}

/** Returns the count of active (non-deleted) products for a seller. */
export async function checkProductLimit(sellerId: string): Promise<number> {
  return prisma.sellerProduct.count({
    where: { sellerId, deletedAt: null },
  });
}

export interface SlotPackage {
  slots: number;
  price: number;
}

export type SellerTierKey = "STANDARD" | "SILVER" | "GOLD" | "VIP";

export interface TierConfig {
  fee_percent: number;
  min_withdrawal: number;
  hold_days: number;
}

export const DEFAULT_TIER_CONFIG: Record<SellerTierKey, TierConfig> = {
  STANDARD: { fee_percent: 5, min_withdrawal: 200_000, hold_days: 3 },
  SILVER:   { fee_percent: 4, min_withdrawal: 150_000, hold_days: 2 },
  GOLD:     { fee_percent: 3, min_withdrawal: 100_000, hold_days: 1 },
  VIP:      { fee_percent: 1, min_withdrawal: 50_000,  hold_days: 0 },
};

export interface SystemSellerConfig {
  order_hold_days?: number;
  withdrawal_fee_percent?: number;
  min_withdrawal_amount?: number;
  slot_packages?: SlotPackage[];
  tier_config?: Record<SellerTierKey, TierConfig>;
}

export const DEFAULT_SLOT_PACKAGES: SlotPackage[] = [
  { slots: 5,  price: 50_000 },
  { slots: 7,  price: 80_000 },
  { slots: 10, price: 120_000 },
];

/** Returns effective withdrawal config for a seller based on their tier. */
export function getSellerTierConfig(
  config: SystemSellerConfig,
  tier: SellerTierKey,
): TierConfig {
  const tierMap = config.tier_config ?? DEFAULT_TIER_CONFIG;
  return tierMap[tier] ?? DEFAULT_TIER_CONFIG[tier] ?? DEFAULT_TIER_CONFIG.STANDARD;
}

/** Reads seller_settings from system_config. */
export async function getSellerConfig(): Promise<SystemSellerConfig> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "seller_settings" },
    select: { value: true },
  });
  return (config?.value as SystemSellerConfig) ?? {};
}

interface BuySellerSlotsParams {
  userId: string;
  slots: number;
  price: number;
}

/** Deducts fee and sets maxSellerProducts to purchased slot count. */
export async function buySellerSlots(params: BuySellerSlotsParams): Promise<void> {
  const { userId, slots, price } = params;

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ balance: string; seller_status: string }>
    >`SELECT balance, seller_status FROM users WHERE id = ${userId}::uuid FOR UPDATE`;

    const user = rows[0];
    if (!user) throw new NotFoundError("User");
    if (user.seller_status !== "APPROVED") {
      throw new ValidationError("Tài khoản chưa được duyệt làm seller");
    }

    const balance = new Decimal(user.balance);
    const cost = new Decimal(Number(price));
    if (balance.lt(cost)) throw new InsufficientBalanceError(balance.toNumber(), cost.toNumber());

    const balanceAfter = balance.sub(cost);

    await tx.$executeRaw`
      UPDATE users
      SET balance = ${balanceAfter.toFixed(2)}::numeric,
          max_seller_products = ${slots},
          updated_at = now()
      WHERE id = ${userId}::uuid
    `;

    await tx.transaction.create({
      data: {
        userId,
        type: "SELLER_SLOT_PURCHASE",
        amount: cost.neg().toFixed(2),
        description: `Mua gói ${slots} slot sản phẩm`,
        balanceBefore: balance.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "SELLER_SLOT_PURCHASE",
        targetType: "User",
        targetId: userId,
        metadata: { slots, price },
      },
    });
  });

  logger.info({ userId, slots, price }, "Seller slot purchased");
}
