import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { encrypt } from "@/lib/security/encryption";
import {
  InsufficientBalanceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import { notifySellerSlotUpgrade } from "@/lib/services/telegram-alert.service";

interface RegisterSellerParams {
  userId: string;
  category: string;
  subCategoryIds?: string[];
  storeType?: "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN";
  ip?: string;
}

/** Deducts registration fee (from system_config) and creates a pending seller request. */
export async function registerSeller(params: RegisterSellerParams): Promise<void> {
  const { userId, category, subCategoryIds = [], storeType = "TAI_NGUYEN_MMO", ip } = params;
  const SELLER_REGISTRATION_FEE = await getRegistrationFee();

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
      create: { userId, category, storeType, fee: fee.toFixed(2) },
      update: {
        category, storeType, fee: fee.toFixed(2), status: "PENDING",
        rejectReason: null, approvedCategory: null,
        approvedAt: null, rejectedAt: null, reviewedByUserId: null,
      },
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

    // Store requested sub-categories — luôn xóa cũ khi re-register để không giữ lại sub từ đơn trước
    await tx.userSubCategory.deleteMany({ where: { userId } });
    if (subCategoryIds.length > 0) {
      await tx.userSubCategory.createMany({
        data: subCategoryIds.map((subCategoryId) => ({ userId, subCategoryId })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "SELLER_REGISTRATION_REQUESTED",
        targetType: "SellerRequest",
        targetId: userId,
        metadata: { category, storeType, subCategoryCount: subCategoryIds.length, ip: ip ?? "unknown" },
      },
    });
  });

  logger.info({ userId, category }, "Seller registration submitted");
}

interface AddProductParams {
  sellerId: string;
  name: string;
  price: number;
  warrantyInfo: string;
  description?: string;
  imageUrl?: string;
  sellerCategory: string;
  subCategoryId?: string | null;
  stockItems: string[];
  storeType?: "KHO_TAI_NGUYEN" | "TAI_NGUYEN_MMO"; // nếu có, dùng thay vì fetch từ sellerRequest
  // Nguồn gốc sản phẩm — bắt buộc khi đăng bán
  originType: "SELF_CREATED" | "SELF_RAISED" | "BOUGHT_INDIVIDUAL" | "BOUGHT_BUSINESS" | "LEGAL_TRANSFER" | "OTHER";
  originDescription: string;
  originCommitment: true;
}

/** Adds a new product with encrypted stock items. Enforces product limit. */
export async function addSellerProduct(params: AddProductParams): Promise<string> {
  const { sellerId, name, price, warrantyInfo, description, imageUrl, sellerCategory, subCategoryId, stockItems, originType, originDescription, originCommitment } = params;

  const productCount = await checkProductLimit(sellerId);
  const [seller, sellerRequest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { maxSellerProducts: true, sellerStatus: true },
    }),
    prisma.sellerRequest.findUnique({
      where: { userId: sellerId },
      select: { storeType: true },
    }),
  ]);

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

  const storeType = params.storeType ?? sellerRequest?.storeType ?? "TAI_NGUYEN_MMO";

  const product = await prisma.sellerProduct.create({
    data: {
      sellerId,
      sellerCategory,
      subCategoryId: subCategoryId ?? null,
      storeType,
      name,
      price: new Decimal(price).toFixed(2),
      warrantyInfo,
      description,
      imageUrl,
      originType,
      originDescription,
      originCommitment,
      approvalStatus: "PENDING",
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

// Kept for backward-compat type hints — DB now stores tier as free-form string
export type SellerTierKey = string;

export interface TierConfig {
  fee_percent: number;
  min_withdrawal: number;
  hold_days: number;
  label?: string;
  description?: string;
  badge_color?: string;
  benefits?: string[];
  upgrade_min_revenue?: number;
  upgrade_min_orders?: number;
}

// Fallback used when the DB has no matching tier definition
export const FALLBACK_TIER_CONFIG: TierConfig = {
  fee_percent: 5, min_withdrawal: 200_000, hold_days: 3,
  label: "Standard", badge_color: "gray", benefits: [],
  upgrade_min_revenue: 0, upgrade_min_orders: 0,
};

export interface SystemSellerConfig {
  order_hold_days?: number;
  withdrawal_fee_percent?: number;
  min_withdrawal_amount?: number;
  slot_packages?: SlotPackage[];
  registration_fee?: number;
}

export const DEFAULT_SLOT_PACKAGES: SlotPackage[] = [
  { slots: 5,  price: 50_000 },
  { slots: 7,  price: 80_000 },
  { slots: 10, price: 120_000 },
];

/** Returns TierConfig from DB for a given tier key. Falls back to FALLBACK_TIER_CONFIG. */
export async function getSellerTierConfig(tierKey: string): Promise<TierConfig> {
  const row = await prisma.sellerTierDefinition.findUnique({ where: { key: tierKey } });
  if (!row) return FALLBACK_TIER_CONFIG;
  return {
    fee_percent:         row.feePercent,
    min_withdrawal:      row.minWithdrawal,
    hold_days:           row.holdDays,
    label:               row.label,
    description:         row.description ?? undefined,
    badge_color:         row.badgeColor,
    benefits:            row.benefits as string[],
    upgrade_min_revenue: row.upgradeMinRevenue,
    upgrade_min_orders:  row.upgradeMinOrders,
  };
}

/** Returns all active tier definitions ordered by displayOrder. */
export async function getAllTierDefinitions() {
  return prisma.sellerTierDefinition.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}

/** Returns ALL tier definitions (including inactive) for admin management. */
export async function getAllTierDefinitionsAdmin() {
  return prisma.sellerTierDefinition.findMany({ orderBy: { displayOrder: "asc" } });
}

/** Reads seller_settings from system_config. */
export async function getSellerConfig(): Promise<SystemSellerConfig> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "seller_settings" },
    select: { value: true },
  });
  return (config?.value as SystemSellerConfig) ?? {};
}

/** Returns the effective registration fee (from system_config or default 50,000đ). */
export async function getRegistrationFee(): Promise<number> {
  const config = await getSellerConfig();
  return config.registration_fee ?? 50_000;
}

interface BuySellerSlotsParams {
  userId: string;
  slots: number;
  price: number;
}

/** Deducts fee and upgrades maxSellerProducts to the purchased slot tier (must be higher than current). */
export async function buySellerSlots(params: BuySellerSlotsParams): Promise<void> {
  const { userId, slots, price } = params;

  let previousSlots = 0;

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ balance: string; seller_status: string; max_seller_products: number }>
    >`SELECT balance, seller_status, max_seller_products FROM users WHERE id = ${userId}::uuid FOR UPDATE`;

    const user = rows[0];
    if (!user) throw new NotFoundError("User");
    previousSlots = user.max_seller_products;
    if (user.seller_status !== "APPROVED") {
      throw new ValidationError("Tài khoản chưa được duyệt làm seller");
    }
    if (slots <= user.max_seller_products) {
      throw new ValidationError(
        `Chỉ có thể nâng cấp lên gói cao hơn gói hiện tại (${user.max_seller_products} slot)`,
      );
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
        description: `Nâng cấp gói slot: ${user.max_seller_products} → ${slots} sản phẩm`,
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
        metadata: { slots, price, previousSlots: user.max_seller_products },
      },
    });
  });

  logger.info({ userId, slots, price }, "Seller slot purchased");

  notifySellerSlotUpgrade(userId, previousSlots, slots, new Decimal(Number(price)).toFixed(0));
}
