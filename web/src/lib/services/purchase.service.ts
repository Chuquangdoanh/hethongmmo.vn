import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js";
import type { OrderType, Order } from "@prisma/client";
import {
  AppError,
  InsufficientBalanceError,
  NotFoundError,
  OutOfStockError,
  ItemInactiveError,
} from "@/lib/errors";
import { decrypt } from "@/lib/security/encryption";
import { logger } from "@/lib/utils/logger";
import { randomBytes } from "crypto";

const ORDER_TYPE_TO_TX: Record<OrderType, string> = {
  SERVICE: "BUY_SERVICE",
  COURSE: "BUY_COURSE",
  TUTTRICK: "BUY_TUTTRICK",
  MMO_PRODUCT: "BUY_MMO_PRODUCT",
  SELLER_PRODUCT: "BUY_SELLER_PRODUCT",
};

interface PurchaseParams {
  userId: string;
  orderType: OrderType;
  itemId: string;
  itemName: string;
  finalPrice: number;
  idempotencyKey: string;
  warrantyVariant?: string;
  customerNote?: string;
}

interface PurchaseResult {
  order: Order;
  deliveredContent?: string;
  tutTrickDocs?: string;
}

function generateOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(2).toString("hex").toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

/**
 * Atomically processes a product purchase: deducts balance, marks item sold,
 * creates order + transaction. Returns decrypted content for digital items.
 */
export async function purchaseProduct(params: PurchaseParams): Promise<PurchaseResult> {
  const { userId, orderType, itemId, itemName, finalPrice, idempotencyKey, warrantyVariant, customerNote } =
    params;

  // Idempotency: return existing order if already processed
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  if (existingOrder) {
    logger.info({ idempotencyKey }, "Duplicate purchase request — returning existing order");
    return { order: existingOrder };
  }

  const price = new Decimal(finalPrice);
  const txType = ORDER_TYPE_TO_TX[orderType];
  if (!txType) throw new AppError("Loại đơn hàng không hợp lệ.", "INVALID_ORDER_TYPE", 400);

  const result = await prisma.$transaction(async (tx) => {
    // ── 1. Lock user balance ──────────────────────────────────────────
    const userRows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const userRow = userRows[0];
    if (!userRow) throw new NotFoundError("User");

    const balanceBefore = new Decimal(userRow.balance);
    if (balanceBefore.lt(price)) {
      throw new InsufficientBalanceError(balanceBefore.toNumber(), price.toNumber());
    }
    const balanceAfter = balanceBefore.sub(price);
    const newTotalSpent = new Decimal(userRow.total_spent).add(price);

    // ── 2. Lock and claim a stock item (digital delivery types) ───────
    let deliveredContent: string | undefined;
    let deliveredItemId: string | undefined;
    let sellerId: string | undefined;
    let tutTrickContentUrlEncRaw: Buffer | undefined;
    let tutTrickDocs: string | undefined;

    if (orderType === "MMO_PRODUCT") {
      const items = await tx.$queryRaw<Array<{ id: string; value_enc: Buffer }>>`
        SELECT id, value_enc FROM mmo_product_items
        WHERE product_id = ${itemId}::uuid AND status = 'AVAILABLE'
        LIMIT 1 FOR UPDATE SKIP LOCKED
      `;
      const item = items[0];
      if (!item) throw new OutOfStockError();

      const orderId = crypto.randomUUID();
      await tx.$executeRaw`
        UPDATE mmo_product_items
        SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
            order_id = ${orderId}::uuid, sold_at = now(), updated_at = now()
        WHERE id = ${item.id}::uuid
      `;
      deliveredItemId = item.id;
      deliveredContent = decrypt(item.value_enc);
    } else if (orderType === "SELLER_PRODUCT") {
      const items = await tx.$queryRaw<
        Array<{ id: string; content_enc: Buffer; seller_id: string }>
      >`
        SELECT sp.id, sp.content_enc, p.seller_id
        FROM seller_product_stock sp
        JOIN seller_products p ON p.id = sp.product_id
        WHERE sp.product_id = ${itemId}::uuid AND sp.status = 'AVAILABLE'
        LIMIT 1 FOR UPDATE SKIP LOCKED
      `;
      const item = items[0];
      if (!item) throw new OutOfStockError();

      const orderId = crypto.randomUUID();
      await tx.$executeRaw`
        UPDATE seller_product_stock
        SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
            order_id = ${orderId}::uuid, sold_at = now()
        WHERE id = ${item.id}::uuid
      `;
      deliveredItemId = item.id;
      deliveredContent = decrypt(item.content_enc);
      sellerId = item.seller_id;

      // Credit seller revenue (70% of price; fees handled during withdrawal)
      const sellerRevenue = price.mul(0.7);
      await tx.$executeRaw`
        UPDATE seller_products
        SET sales_count = sales_count + 1,
            revenue = revenue + ${sellerRevenue.toFixed(2)}::numeric,
            updated_at = now()
        WHERE id = ${itemId}::uuid
      `;
    } else {
      // SERVICE / COURSE / TUTTRICK — no stock item, verify item exists and is active
      const isActive = await checkItemActive(tx, orderType, itemId);
      if (!isActive) throw new ItemInactiveError();
    }

    // ── 2b. Snapshot TutTrick content at purchase time ────────────────
    if (orderType === "TUTTRICK") {
      const rows = await tx.$queryRaw<Array<{ content_url_enc: Buffer | null; docs: string | null }>>`
        SELECT content_url_enc, docs FROM tut_tricks WHERE id = ${itemId}::uuid
      `;
      const row = rows[0];
      if (row?.content_url_enc) tutTrickContentUrlEncRaw = Buffer.from(row.content_url_enc);
      if (row?.docs) tutTrickDocs = row.docs;
      if (tutTrickContentUrlEncRaw) deliveredContent = decrypt(tutTrickContentUrlEncRaw);
    }

    // ── 3. Deduct user balance ────────────────────────────────────────
    await tx.$executeRaw`
      UPDATE users
      SET balance     = ${balanceAfter.toFixed(2)}::numeric,
          total_spent = ${newTotalSpent.toFixed(2)}::numeric,
          updated_at  = now()
      WHERE id = ${userId}::uuid
    `;

    // ── 4. Create order ───────────────────────────────────────────────
    // SERVICE and COURSE require manual admin processing → start as PROCESSING
    const isManualType = orderType === "SERVICE" || orderType === "COURSE";
    const orderCode = generateOrderCode();
    const orderData: Parameters<typeof tx.order.create>[0]["data"] = {
      orderCode,
      userId,
      orderType,
      itemName,
      originalPrice: price.toFixed(2),
      finalPrice: price.toFixed(2),
      warrantyVariant,
      customerNote,
      status: isManualType ? "PROCESSING" : "DONE",
      deliveredItemId,
      // Prisma Bytes accepts Buffer at runtime; cast bridges TS generic variance
      ...(tutTrickContentUrlEncRaw ? { tutTrickContentUrlEnc: tutTrickContentUrlEncRaw as unknown as Uint8Array<ArrayBuffer> } : {}),
      tutTrickDocs,
      idempotencyKey,
      ...(isManualType ? {} : { completedAt: new Date() }),
    };

    if (orderType === "SERVICE") orderData.serviceId = itemId;
    else if (orderType === "COURSE") orderData.courseId = itemId;
    else if (orderType === "TUTTRICK") orderData.tutTrickId = itemId;
    else if (orderType === "MMO_PRODUCT") orderData.mmoProductId = itemId;
    else if (orderType === "SELLER_PRODUCT") {
      orderData.sellerProductId = itemId;
      orderData.sellerId = sellerId;
    }

    const order = await tx.order.create({ data: orderData });

    // ── 5. Create transaction record ──────────────────────────────────
    await tx.transaction.create({
      data: {
        userId,
        orderId: order.id,
        type: txType as never,
        amount: price.neg().toFixed(2),
        description: `Mua: ${itemName}`,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });

    // ── 6. Notification ───────────────────────────────────────────────
    await tx.notification.create({
      data: {
        userId,
        title: "Mua hàng thành công",
        body: `Đơn hàng ${orderCode} - ${itemName} đã được xử lý.`,
        type: "PURCHASE",
        meta: { orderCode, orderType, amount: price.toFixed(2) },
      },
    });

    return { order, deliveredContent, tutTrickDocs };
  });

  logger.info({ userId, orderType, itemId, orderId: result.order.id }, "Purchase processed");
  return result;
}

async function checkItemActive(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderType: OrderType,
  itemId: string,
): Promise<boolean> {
  if (orderType === "SERVICE") {
    const rows = await tx.$queryRaw<Array<{ is_active: boolean }>>`
      SELECT is_active FROM services WHERE id = ${itemId}::uuid AND deleted_at IS NULL
    `;
    return rows[0]?.is_active ?? false;
  }
  if (orderType === "COURSE") {
    const rows = await tx.$queryRaw<Array<{ is_active: boolean }>>`
      SELECT is_active FROM courses WHERE id = ${itemId}::uuid AND deleted_at IS NULL
    `;
    return rows[0]?.is_active ?? false;
  }
  if (orderType === "TUTTRICK") {
    const rows = await tx.$queryRaw<Array<{ is_active: boolean }>>`
      SELECT is_active FROM tut_tricks WHERE id = ${itemId}::uuid AND deleted_at IS NULL
    `;
    return rows[0]?.is_active ?? false;
  }
  return false;
}
