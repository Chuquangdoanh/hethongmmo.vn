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
import { notifyPurchaseSuccess, notifySellerNewOrder } from "@/lib/services/telegram-alert.service";
import { createAffiliateCommission } from "@/lib/services/affiliate-commission.service";
import { redeemCouponInTransaction } from "@/lib/services/coupon.service";
import { LIMITS } from "@/lib/constants/limits";
import { formatVnd } from "@/lib/utils/format";

// ── Course deposit constants ──────────────────────────────────────────────────
export const COURSE_DEPOSIT_AMOUNT = 5_000_000;
export const COURSE_DEPOSIT_MIN_PRICE = 25_000_000;
export const COURSE_DEPOSIT_MAX_PRICE = 100_000_000;

export function isCourseDepositEligible(price: number): boolean {
  return price >= COURSE_DEPOSIT_MIN_PRICE && price <= COURSE_DEPOSIT_MAX_PRICE;
}

const ORDER_TYPE_TO_TX: Record<OrderType, string> = {
  SERVICE:          "BUY_SERVICE",
  COURSE:           "BUY_COURSE",
  TUTTRICK:         "BUY_TUTTRICK",
  MMO_PRODUCT:      "BUY_MMO_PRODUCT",
  SELLER_PRODUCT:   "BUY_SELLER_PRODUCT",
  KHUONGFB_PRODUCT: "BUY_KHUONGFB_PRODUCT",
  VPS_PRODUCT:      "BUY_VPS_PRODUCT",
};

interface PurchaseParams {
  userId: string;
  orderType: OrderType;
  itemId: string;
  itemName: string;
  catalogPrice: number;   // giá gốc trước giảm
  finalPrice: number;     // giá thực trả (= catalogPrice khi không có discount)
  discountPercent: number;
  idempotencyKey: string;
  variantId?: string;
  warrantyVariant?: string;
  customerNote?: string;
  quantity?: number;      // số lượng mua (default 1)
  // Mã giảm giá — chỉ hỗ trợ khi quantity = 1 (batch purchase tạo nhiều order riêng biệt,
  // không thể chia đều 1 lượt coupon cho N đơn một cách nhất quán).
  coupon?: { id: string; maxUses: number };
}

interface PurchaseResult {
  order: Order;
  orders?: Order[];           // tất cả orders khi quantity > 1
  deliveredContent?: string;  // nội dung khi quantity = 1
  deliveredContents?: string[]; // tất cả nội dung khi quantity > 1
  quantity?: number;
  tutTrickDocs?: string;
  isDeposit?: boolean;
  depositAmount?: number;
  remainingAmount?: number;
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
  const { userId, orderType, itemId, itemName, catalogPrice, finalPrice, discountPercent, idempotencyKey, variantId, warrantyVariant, customerNote, coupon } =
    params;
  const quantity = params.quantity ?? 1;

  if (coupon && quantity > 1) {
    throw new AppError("Mã giảm giá chỉ áp dụng khi mua số lượng 1.", "COUPON_QUANTITY_NOT_SUPPORTED", 400);
  }

  // Delegate to batch handler when buying multiple units
  if (quantity > 1) {
    return purchaseProductBatch({ ...params, quantity });
  }

  // Idempotency: return existing order if already processed
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  if (existingOrder) {
    logger.info({ idempotencyKey }, "Duplicate purchase request — returning existing order");
    return { order: existingOrder };
  }

  const txType = ORDER_TYPE_TO_TX[orderType];
  if (!txType) throw new AppError("Loại đơn hàng không hợp lệ.", "INVALID_ORDER_TYPE", 400);

  // ── Course deposit path ───────────────────────────────────────────────────
  if (orderType === "COURSE" && isCourseDepositEligible(finalPrice)) {
    return purchaseCourseDeposit({ userId, itemId, itemName, catalogPrice, finalPrice, discountPercent, idempotencyKey, warrantyVariant, customerNote });
  }

  // ── Standard full-payment path ────────────────────────────────────────────
  const price = new Decimal(finalPrice);

  const result = await prisma.$transaction(async (tx) => {
    // ── 1. Lock user balance ──────────────────────────────────────────
    const userRows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const userRow = userRows[0];
    if (!userRow) throw new NotFoundError("User");

    const balanceBefore = new Decimal(userRow.balance);

    // Tut-trick: yêu cầu số dư tối thiểu, độc lập với giá tài liệu
    if (orderType === "TUTTRICK" && balanceBefore.lt(LIMITS.TUTTRICK_MIN_BALANCE)) {
      throw new AppError(
        `Số dư tài khoản phải từ ${formatVnd(LIMITS.TUTTRICK_MIN_BALANCE)} trở lên mới có thể mua tài liệu.`,
        "TUTTRICK_MIN_BALANCE_REQUIRED",
        402,
      );
    }

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
    // Pre-generated so stock item and order share the same UUID
    let preGeneratedOrderId: string | undefined;

    if (orderType === "MMO_PRODUCT") {
      const items = await tx.$queryRaw<Array<{ id: string; value_enc: Buffer }>>`
        SELECT id, value_enc FROM mmo_product_items
        WHERE product_id = ${itemId}::uuid AND status = 'AVAILABLE'
        LIMIT 1 FOR UPDATE SKIP LOCKED
      `;
      const item = items[0];
      if (!item) throw new OutOfStockError();

      // Pre-generate order ID so stock row and order share the same UUID
      preGeneratedOrderId = crypto.randomUUID();
      await tx.$executeRaw`
        UPDATE mmo_product_items
        SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
            order_id = ${preGeneratedOrderId}::uuid, sold_at = now(), updated_at = now()
        WHERE id = ${item.id}::uuid
      `;
      await tx.$executeRaw`
        UPDATE mmo_products
        SET total_orders = total_orders + 1, updated_at = now()
        WHERE id = ${itemId}::uuid
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

      // Pre-generate order ID so stock row and order share the same UUID
      preGeneratedOrderId = crypto.randomUUID();
      await tx.$executeRaw`
        UPDATE seller_product_stock
        SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
            order_id = ${preGeneratedOrderId}::uuid, sold_at = now()
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
      originalPrice: new Decimal(catalogPrice).toFixed(2),
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
      ...(coupon ? { couponId: coupon.id } : {}),
    };

    if (orderType === "SERVICE") orderData.serviceId = itemId;
    else if (orderType === "COURSE") orderData.courseId = itemId;
    else if (orderType === "TUTTRICK") orderData.tutTrickId = itemId;
    else if (orderType === "MMO_PRODUCT") orderData.mmoProductId = itemId;
    else if (orderType === "SELLER_PRODUCT") {
      orderData.sellerProductId = itemId;
      orderData.sellerId = sellerId;
    }

    const order = await tx.order.create({
      data: {
        ...(preGeneratedOrderId ? { id: preGeneratedOrderId } : {}),
        ...orderData,
      },
    });

    if (coupon) {
      await redeemCouponInTransaction(tx, { couponId: coupon.id, maxUses: coupon.maxUses, userId, orderId: order.id });
    }

    if (!isManualType) {
      await createAffiliateCommission(tx, { id: order.id, userId, orderType, finalPrice: order.finalPrice });
    }

    // ── 5. Create transaction record ──────────────────────────────────
    await tx.transaction.create({
      data: {
        userId,
        orderId: order.id,
        type: txType as never,
        amount: price.neg().toFixed(2),
        description: discountPercent > 0
          ? `Mua: ${itemName} (giảm ${discountPercent}%)`
          : `Mua: ${itemName}`,
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

  notifyPurchaseSuccess(
    userId,
    itemName,
    price.toFixed(0),
    result.order.orderCode,
    orderType === "SELLER_PRODUCT"
      ? { kind: "SELLER", sellerId: result.order.sellerId ?? undefined }
      : { kind: "SYSTEM" },
  );

  if (orderType === "SELLER_PRODUCT" && result.order.sellerId) {
    notifySellerNewOrder(result.order.sellerId, itemName, price.toFixed(0), result.order.orderCode);
  }

  return result;
}

// ── Course deposit purchase ───────────────────────────────────────────────────

interface CourseDepositParams {
  userId: string;
  itemId: string;
  itemName: string;
  catalogPrice: number;
  finalPrice: number;
  discountPercent: number;
  idempotencyKey: string;
  warrantyVariant?: string;
  customerNote?: string;
}

async function purchaseCourseDeposit(params: CourseDepositParams): Promise<PurchaseResult> {
  const { userId, itemId, itemName, catalogPrice, finalPrice, discountPercent, idempotencyKey, warrantyVariant, customerNote } = params;

  const deposit = new Decimal(COURSE_DEPOSIT_AMOUNT);
  const remaining = new Decimal(finalPrice).sub(deposit);

  // Check existing non-cancelled deposit/processing order for this course
  const existingCourseOrder = await prisma.order.findFirst({
    where: {
      userId,
      courseId: itemId,
      orderType: "COURSE",
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: { id: true, paymentType: true, remainingAmount: true },
  });
  if (existingCourseOrder) {
    if (existingCourseOrder.paymentType === "DEPOSIT" && existingCourseOrder.remainingAmount && Number(existingCourseOrder.remainingAmount) > 0) {
      throw new AppError(
        "Bạn đã đặt cọc khóa học này rồi. Hãy thanh toán phần còn lại trong mục Đơn hàng.",
        "COURSE_DEPOSIT_EXISTS",
        409,
      );
    }
    throw new AppError("Bạn đã đăng ký khóa học này rồi.", "COURSE_ALREADY_REGISTERED", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Lock user balance
    const userRows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const userRow = userRows[0];
    if (!userRow) throw new NotFoundError("User");

    const balanceBefore = new Decimal(userRow.balance);
    if (balanceBefore.lt(deposit)) {
      throw new InsufficientBalanceError(balanceBefore.toNumber(), deposit.toNumber());
    }
    const balanceAfter = balanceBefore.sub(deposit);
    const newTotalSpent = new Decimal(userRow.total_spent).add(deposit);

    // Verify course is still active
    const courseRows = await tx.$queryRaw<Array<{ is_active: boolean }>>`
      SELECT is_active FROM courses WHERE id = ${itemId}::uuid AND deleted_at IS NULL
    `;
    if (!courseRows[0]?.is_active) throw new ItemInactiveError();

    // Deduct deposit from balance
    await tx.$executeRaw`
      UPDATE users
      SET balance     = ${balanceAfter.toFixed(2)}::numeric,
          total_spent = ${newTotalSpent.toFixed(2)}::numeric,
          updated_at  = now()
      WHERE id = ${userId}::uuid
    `;

    const orderCode = generateOrderCode();
    const order = await tx.order.create({
      data: {
        orderCode,
        userId,
        courseId: itemId,
        orderType: "COURSE",
        itemName,
        originalPrice: new Decimal(catalogPrice).toFixed(2),
        finalPrice: deposit.toFixed(2),
        warrantyVariant,
        customerNote,
        status: "PROCESSING",
        idempotencyKey,
        paymentType: "DEPOSIT",
        depositAmount: deposit.toFixed(2),
        remainingAmount: remaining.toFixed(2),
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        orderId: order.id,
        type: "COURSE_DEPOSIT" as never,
        amount: deposit.neg().toFixed(2),
        description: discountPercent > 0
          ? `Đặt cọc khóa học: ${itemName} (giảm ${discountPercent}%) — còn lại ${remaining.toFixed(0)}đ`
          : `Đặt cọc khóa học: ${itemName} — còn lại ${remaining.toFixed(0)}đ`,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Đặt cọc khóa học thành công",
        body: `Đã cọc ${COURSE_DEPOSIT_AMOUNT.toLocaleString("vi-VN")}đ cho khóa học ${itemName}. Còn lại ${remaining.toNumber().toLocaleString("vi-VN")}đ.`,
        type: "PURCHASE",
        meta: { orderCode, orderType: "COURSE", depositAmount: deposit.toFixed(2), remainingAmount: remaining.toFixed(2) },
      },
    });

    return { order };
  });

  logger.info({ userId, itemId, orderId: result.order.id }, "Course deposit processed");

  notifyPurchaseSuccess(userId, `Đặt cọc khóa học: ${itemName}`, deposit.toFixed(0), result.order.orderCode, { kind: "SYSTEM" });

  return {
    order: result.order,
    isDeposit: true,
    depositAmount: deposit.toNumber(),
    remainingAmount: remaining.toNumber(),
  };
}

// ── Pay remaining balance for a deposited course ──────────────────────────────

export async function purchaseCourseRemainder(orderId: string, userId: string): Promise<Order> {
  // Fetch order with IDOR protection
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, orderType: "COURSE", paymentType: "DEPOSIT" },
    select: {
      id: true, orderCode: true, itemName: true, courseId: true,
      remainingAmount: true, finalPrice: true, originalPrice: true,
      status: true,
    },
  });

  if (!order) throw new NotFoundError("Đơn hàng");
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    throw new AppError("Đơn hàng đã bị hủy hoặc hoàn tiền.", "ORDER_NOT_ACTIVE", 400);
  }
  const remaining = new Decimal(order.remainingAmount ?? 0);
  if (remaining.lte(0)) {
    throw new AppError("Khóa học này đã được thanh toán đầy đủ.", "ALREADY_FULLY_PAID", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Lock user balance
    const userRows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const userRow = userRows[0];
    if (!userRow) throw new NotFoundError("User");

    const balanceBefore = new Decimal(userRow.balance);
    if (balanceBefore.lt(remaining)) {
      throw new InsufficientBalanceError(balanceBefore.toNumber(), remaining.toNumber());
    }
    const balanceAfter = balanceBefore.sub(remaining);
    const newTotalSpent = new Decimal(userRow.total_spent).add(remaining);

    await tx.$executeRaw`
      UPDATE users
      SET balance     = ${balanceAfter.toFixed(2)}::numeric,
          total_spent = ${newTotalSpent.toFixed(2)}::numeric,
          updated_at  = now()
      WHERE id = ${userId}::uuid
    `;

    const newFinalPrice = new Decimal(order.finalPrice).add(remaining);

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentType: "FULL",
        remainingAmount: "0",
        finalPrice: newFinalPrice.toFixed(2),
        finalPaidAt: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        orderId,
        type: "COURSE_FINAL_PAYMENT" as never,
        amount: remaining.neg().toFixed(2),
        description: `Thanh toán phần còn lại khóa học: ${order.itemName}`,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Thanh toán khóa học hoàn tất",
        body: `Đã thanh toán đủ cho khóa học ${order.itemName}. Đơn hàng #${order.orderCode} đang được xử lý.`,
        type: "PURCHASE",
        meta: { orderCode: order.orderCode, amount: remaining.toFixed(2) },
      },
    });

    return updatedOrder;
  });

  logger.info({ userId, orderId }, "Course final payment processed");

  notifyPurchaseSuccess(userId, `Thanh toán nốt khóa học: ${order.itemName}`, remaining.toFixed(0), order.orderCode, { kind: "SYSTEM" });

  return updated;
}

// ── Batch purchase (quantity > 1) ─────────────────────────────────────────────

interface BatchPurchaseParams extends PurchaseParams {
  quantity: number; // guaranteed > 1 when this function is called
}

async function purchaseProductBatch(params: BatchPurchaseParams): Promise<PurchaseResult> {
  const { userId, orderType, itemId, itemName, catalogPrice, finalPrice, discountPercent, idempotencyKey, warrantyVariant, customerNote, quantity } = params;

  if (orderType !== "MMO_PRODUCT" && orderType !== "SELLER_PRODUCT") {
    throw new AppError("Chỉ hỗ trợ mua nhiều cho sản phẩm MMO và Seller.", "BATCH_NOT_SUPPORTED", 400);
  }

  // Idempotency: first order in batch carries the user's idempotencyKey
  const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existingOrder) {
    logger.info({ idempotencyKey }, "Duplicate batch purchase — returning existing order");
    return { order: existingOrder, quantity };
  }

  const txType = ORDER_TYPE_TO_TX[orderType];
  const unitPrice = new Decimal(finalPrice);
  const totalPrice = unitPrice.mul(quantity);

  const result = await prisma.$transaction(async (tx) => {
    // ── 1. Lock user balance ──────────────────────────────────────────
    const userRows = await tx.$queryRaw<Array<{ balance: string; total_spent: string }>>`
      SELECT balance, total_spent FROM users WHERE id = ${userId}::uuid FOR UPDATE
    `;
    const userRow = userRows[0];
    if (!userRow) throw new NotFoundError("User");

    const balanceBefore = new Decimal(userRow.balance);
    if (balanceBefore.lt(totalPrice)) {
      throw new InsufficientBalanceError(balanceBefore.toNumber(), totalPrice.toNumber());
    }
    const balanceAfter = balanceBefore.sub(totalPrice);
    const newTotalSpent = new Decimal(userRow.total_spent).add(totalPrice);

    // ── 2. Claim N stock items and pre-assign order IDs ───────────────
    type ClaimedItem = { stockItemId: string; orderId: string; content: string; sellerId?: string };
    const claimed: ClaimedItem[] = [];

    if (orderType === "MMO_PRODUCT") {
      const items = await tx.$queryRaw<Array<{ id: string; value_enc: Buffer }>>`
        SELECT id, value_enc FROM mmo_product_items
        WHERE product_id = ${itemId}::uuid AND status = 'AVAILABLE'
        LIMIT ${quantity} FOR UPDATE SKIP LOCKED
      `;
      if (items.length < quantity) throw new OutOfStockError();

      for (const item of items) {
        const orderId = crypto.randomUUID();
        await tx.$executeRaw`
          UPDATE mmo_product_items
          SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
              order_id = ${orderId}::uuid, sold_at = now(), updated_at = now()
          WHERE id = ${item.id}::uuid
        `;
        claimed.push({ stockItemId: item.id, orderId, content: decrypt(item.value_enc) });
      }
      await tx.$executeRaw`
        UPDATE mmo_products SET total_orders = total_orders + ${quantity}, updated_at = now()
        WHERE id = ${itemId}::uuid
      `;
    } else {
      // SELLER_PRODUCT
      const items = await tx.$queryRaw<Array<{ id: string; content_enc: Buffer; seller_id: string }>>`
        SELECT sp.id, sp.content_enc, p.seller_id
        FROM seller_product_stock sp
        JOIN seller_products p ON p.id = sp.product_id
        WHERE sp.product_id = ${itemId}::uuid AND sp.status = 'AVAILABLE'
        LIMIT ${quantity} FOR UPDATE SKIP LOCKED
      `;
      if (items.length < quantity) throw new OutOfStockError();

      const sellerRevenue = unitPrice.mul(0.7).mul(quantity);
      for (const item of items) {
        const orderId = crypto.randomUUID();
        await tx.$executeRaw`
          UPDATE seller_product_stock
          SET status = 'SOLD', sold_to_user_id = ${userId}::uuid,
              order_id = ${orderId}::uuid, sold_at = now()
          WHERE id = ${item.id}::uuid
        `;
        claimed.push({ stockItemId: item.id, orderId, content: decrypt(item.content_enc), sellerId: item.seller_id });
      }
      await tx.$executeRaw`
        UPDATE seller_products
        SET sales_count = sales_count + ${quantity},
            revenue = revenue + ${sellerRevenue.toFixed(2)}::numeric,
            updated_at = now()
        WHERE id = ${itemId}::uuid
      `;
    }

    // ── 3. Deduct balance ─────────────────────────────────────────────
    await tx.$executeRaw`
      UPDATE users
      SET balance     = ${balanceAfter.toFixed(2)}::numeric,
          total_spent = ${newTotalSpent.toFixed(2)}::numeric,
          updated_at  = now()
      WHERE id = ${userId}::uuid
    `;

    // ── 4. Create N orders ────────────────────────────────────────────
    const orders: Order[] = [];
    let orderIndex = 0;
    for (const c of claimed) {
      const orderCode = generateOrderCode();
      const isFirst = orderIndex === 0;

      const orderData: Parameters<typeof tx.order.create>[0]["data"] = {
        id: c.orderId,
        orderCode,
        userId,
        orderType,
        itemName,
        originalPrice: new Decimal(catalogPrice).toFixed(2),
        finalPrice: unitPrice.toFixed(2),
        warrantyVariant,
        customerNote,
        status: "DONE",
        deliveredItemId: c.stockItemId,
        idempotencyKey: isFirst ? idempotencyKey : undefined,
        completedAt: new Date(),
      };

      if (orderType === "MMO_PRODUCT") orderData.mmoProductId = itemId;
      else if (orderType === "SELLER_PRODUCT") {
        orderData.sellerProductId = itemId;
        orderData.sellerId = c.sellerId;
      }

      const order = await tx.order.create({ data: orderData });
      await createAffiliateCommission(tx, { id: order.id, userId, orderType, finalPrice: order.finalPrice });
      orders.push(order);
      orderIndex++;
    }

    // ── 5. Create N transaction records ───────────────────────────────
    let txIndex = 0;
    for (const order of orders) {
      const txBalanceBefore = balanceBefore.sub(unitPrice.mul(txIndex));
      const txBalanceAfter = txBalanceBefore.sub(unitPrice);
      await tx.transaction.create({
        data: {
          userId,
          orderId: order.id,
          type: txType as never,
          amount: unitPrice.neg().toFixed(2),
          description: discountPercent > 0
            ? `Mua (${txIndex + 1}/${quantity}): ${itemName} (giảm ${discountPercent}%)`
            : `Mua (${txIndex + 1}/${quantity}): ${itemName}`,
          balanceBefore: txBalanceBefore.toFixed(2),
          balanceAfter: txBalanceAfter.toFixed(2),
        },
      });
      txIndex++;
    }

    // ── 6. Notification (1 for the batch) ────────────────────────────
    const firstOrder = orders[0];
    if (!firstOrder) throw new AppError("Không tạo được đơn hàng.", "ORDER_CREATE_FAILED", 500);

    await tx.notification.create({
      data: {
        userId,
        title: `Mua hàng thành công (x${quantity})`,
        body: `Đã mua ${quantity} sản phẩm ${itemName}. Mã đơn đầu tiên: ${firstOrder.orderCode}.`,
        type: "PURCHASE",
        meta: { orderCode: firstOrder.orderCode, orderType, amount: totalPrice.toFixed(2), quantity },
      },
    });

    return { orders, deliveredContents: claimed.map((c) => c.content) };
  });

  const firstResultOrder = result.orders[0];
  if (!firstResultOrder) throw new AppError("Lỗi xử lý đơn hàng.", "ORDER_CREATE_FAILED", 500);

  logger.info({ userId, orderType, itemId, quantity, firstOrderId: firstResultOrder.id }, "Batch purchase processed");

  notifyPurchaseSuccess(
    userId,
    `${itemName} (x${quantity})`,
    totalPrice.toFixed(0),
    firstResultOrder.orderCode,
    orderType === "SELLER_PRODUCT"
      ? { kind: "SELLER", sellerId: firstResultOrder.sellerId ?? undefined }
      : { kind: "SYSTEM" },
  );

  if (orderType === "SELLER_PRODUCT" && firstResultOrder.sellerId) {
    notifySellerNewOrder(firstResultOrder.sellerId, `${itemName} (x${quantity})`, totalPrice.toFixed(0), firstResultOrder.orderCode);
  }

  const firstContent = result.deliveredContents[0] ?? "";
  return {
    order: firstResultOrder,
    orders: result.orders,
    deliveredContent: firstContent,
    deliveredContents: result.deliveredContents,
    quantity,
  };
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
