import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { purchaseProduct, isCourseDepositEligible, COURSE_DEPOSIT_AMOUNT } from "@/lib/services/purchase.service";
import { orderRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { trackRateHit } from "@/lib/security/rate-alert";
import { AppError } from "@/lib/errors";
import { apiOk, apiList, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { getDiscountInfo, applyDiscount } from "@/lib/utils/discount";
import { getUserResourceDiscountPercent } from "@/lib/services/discount.service";
import { checkCouponEligibility, applyCouponDiscount } from "@/lib/services/coupon.service";

export const runtime = "nodejs";

const purchaseSchema = z.object({
  itemId: z.string().uuid("itemId phải là UUID hợp lệ"),
  orderType: z.enum(["SERVICE", "COURSE", "TUTTRICK", "MMO_PRODUCT", "SELLER_PRODUCT"]),
  variantId: z.string().uuid().optional(),
  warrantyVariant: z.string().max(200).optional(),
  deviceVariant: z.string().max(200).optional(),
  customerNote: z.string().max(5000).optional(),
  idempotencyKey: z.string().uuid("idempotencyKey phải là UUID"),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  couponCode: z.string().min(3).max(50).trim().toUpperCase().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(["PENDING", "PROCESSING", "DONE", "CANCELLED", "REFUNDED", "DISPUTED"]).optional(),
  orderType: z.enum(["SERVICE", "COURSE", "TUTTRICK", "MMO_PRODUCT", "SELLER_PRODUCT"]).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const { searchParams } = req.nextUrl;
    const query = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!query.success) return apiValidationError(query.error.issues);

    const { page, limit, status, orderType } = query.data;

    const where = {
      userId: me.id,
      ...(status ? { status } : {}),
      ...(orderType ? { orderType } : {}),
    };

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderCode: true,
          orderType: true,
          itemName: true,
          finalPrice: true,
          warrantyVariant: true,
          status: true,
          paymentType: true,
          depositAmount: true,
          remainingAmount: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return apiList(orders, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    // Rate limit: 20 lần/phút per userId — alert Telegram khi bị spam
    const rl = await checkRateLimit(orderRatelimit, `orders:${me.id}`);
    if (!rl.success) {
      trackRateHit("order", `orders:${me.id}`, "/api/orders");
      return apiError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", "RATE_LIMITED", 429, { "Retry-After": "60" });
    }

    const body: unknown = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { itemId, orderType, variantId, warrantyVariant, deviceVariant, customerNote, idempotencyKey, quantity, couponCode } = parsed.data;

    // Resolve catalog price server-side (không tin client)
    const { itemName, catalogPrice, resolvedWarranty } = await resolveItem(orderType, itemId, deviceVariant, warrantyVariant, variantId);

    const discountPct = await resolveDiscountPercent(orderType, me.id);
    const tierDiscountedPrice = applyDiscount(catalogPrice, discountPct);

    // Mã giảm giá chỉ áp dụng cho Kho tài nguyên (SELLER_PRODUCT) / Tài nguyên MMO (MMO_PRODUCT), giảm thêm trên giá đã có tier/agent discount.
    let finalPrice = tierDiscountedPrice;
    let coupon: { id: string; maxUses: number } | undefined;
    if (couponCode) {
      if (orderType !== "MMO_PRODUCT" && orderType !== "SELLER_PRODUCT") {
        return apiError("Mã giảm giá không áp dụng cho loại sản phẩm này.", "COUPON_PRODUCT_NOT_APPLICABLE", 400);
      }
      if (quantity > 1) {
        return apiError("Mã giảm giá chỉ áp dụng khi mua số lượng 1.", "COUPON_QUANTITY_NOT_SUPPORTED", 400);
      }
      const eligible = await checkCouponEligibility({
        code: couponCode,
        userId: me.id,
        orderType,
        productId: itemId,
        orderValue: tierDiscountedPrice,
      });
      coupon = { id: eligible.id, maxUses: eligible.maxUses };
      finalPrice = applyCouponDiscount(tierDiscountedPrice, eligible);
    }

    const result = await purchaseProduct({
      userId: me.id,
      orderType,
      itemId,
      itemName,
      catalogPrice,
      finalPrice,
      discountPercent: discountPct,
      idempotencyKey,
      variantId,
      warrantyVariant: resolvedWarranty ?? warrantyVariant,
      customerNote,
      quantity,
      coupon,
    });

    return apiOk(
      {
        orderId: result.order.id,
        orderCode: result.order.orderCode,
        orderType: result.order.orderType,
        itemName: result.order.itemName,
        finalPrice: result.order.finalPrice,
        status: result.order.status,
        quantity: result.quantity ?? 1,
        deliveredContent: result.deliveredContent,
        deliveredContents: result.deliveredContents ?? null,
        tutTrickDocs: result.tutTrickDocs ?? null,
        isDeposit: result.isDeposit ?? false,
        depositAmount: result.depositAmount ?? null,
        remainingAmount: result.remainingAmount ?? null,
        ...(result.isDeposit && isCourseDepositEligible(finalPrice)
          ? { depositInfo: { depositAmount: COURSE_DEPOSIT_AMOUNT, remainingAmount: result.remainingAmount } }
          : {}),
      },
      201,
    );
  } catch (err) {
    return apiCatch(err);
  }
}

// SERVICE/COURSE/TUTTRICK dùng tier nạp tiền + override admin (discountPercent).
// MMO_PRODUCT (Tài nguyên MMO / Kho nguyên liệu) dùng thêm agentDiscountPercent (Đại lý), ưu tiên cao hơn tier.
const SERVICE_DISCOUNTABLE: string[] = ["SERVICE", "COURSE", "TUTTRICK"];
const RESOURCE_DISCOUNTABLE: string[] = ["MMO_PRODUCT"];

async function resolveDiscountPercent(orderType: string, userId: string): Promise<number> {
  if (SERVICE_DISCOUNTABLE.includes(orderType)) {
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { discountPercent: true, totalDeposited: true },
    });
    if (!userRow) return 0;
    return getDiscountInfo(Number(userRow.totalDeposited), userRow.discountPercent).pct;
  }
  if (RESOURCE_DISCOUNTABLE.includes(orderType)) {
    return getUserResourceDiscountPercent(userId);
  }
  return 0;
}

function parseVariantArray(raw: unknown): { name: string; price: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object" && "name" in item) {
      const obj = item as Record<string, unknown>;
      return [{ name: String(obj.name ?? ""), price: Number(obj.price ?? 0) }];
    }
    return [];
  });
}

async function resolveItem(
  orderType: string,
  itemId: string,
  deviceVariant?: string,
  warrantyVariant?: string,
  variantId?: string,
): Promise<{ itemName: string; catalogPrice: number; resolvedWarranty?: string }> {
  if (orderType === "SERVICE") {
    const row = await prisma.service.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true, productList: true, warrantyOptions: true },
    });
    if (!row) throw new AppError("Dịch vụ không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);

    const deviceVariants = parseVariantArray(row.productList);
    let catalogPrice = Number(row.price);
    let nameSuffix = "";

    if (deviceVariants.length > 0) {
      if (!deviceVariant) {
        throw new AppError("Vui lòng chọn thiết bị cần xử lý.", "DEVICE_REQUIRED", 400);
      }
      const variant = deviceVariants.find(v => v.name === deviceVariant);
      if (!variant) {
        throw new AppError("Thiết bị không hợp lệ, vui lòng chọn lại.", "INVALID_DEVICE", 400);
      }
      catalogPrice = variant.price;
      nameSuffix = ` (${variant.name})`;
    }

    // Add warranty price server-side (warranty không được giảm giá)
    const warrantyOpts = parseVariantArray(row.warrantyOptions);
    if (warrantyVariant) {
      const wOption = warrantyOpts.find(w => w.name === warrantyVariant);
      if (wOption && wOption.price > 0) {
        catalogPrice += wOption.price;
      }
    }

    return { itemName: row.name + nameSuffix, catalogPrice };
  }
  if (orderType === "COURSE") {
    const row = await prisma.course.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, salePrice: true },
    });
    if (!row) throw new AppError("Khóa học không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, catalogPrice: Number(row.salePrice) };
  }
  if (orderType === "TUTTRICK") {
    const row = await prisma.tutTrick.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Tài liệu không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, catalogPrice: Number(row.price) };
  }
  if (orderType === "MMO_PRODUCT") {
    const row = await prisma.mmoProduct.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Sản phẩm không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);

    if (variantId) {
      const variant = await prisma.mmoProductVariant.findUnique({
        where: { id: variantId, productId: itemId, isActive: true, deletedAt: null },
        select: { variantPrice: true, warranty: true },
      });
      if (!variant) throw new AppError("Gói sản phẩm không tồn tại hoặc đã bị tắt.", "VARIANT_NOT_FOUND", 400);
      return { itemName: row.name, catalogPrice: Number(variant.variantPrice), resolvedWarranty: variant.warranty };
    }

    return { itemName: row.name, catalogPrice: Number(row.price) };
  }
  if (orderType === "SELLER_PRODUCT") {
    const row = await prisma.sellerProduct.findUnique({
      where: { id: itemId, isActive: true, isHidden: false, approvalStatus: "APPROVED", deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Sản phẩm không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);

    // Nếu có variantId → dùng giá và bảo hành của gói đó
    if (variantId) {
      const variant = await prisma.sellerProductVariant.findUnique({
        where: { id: variantId, productId: itemId, isActive: true, deletedAt: null },
        select: { variantPrice: true, warranty: true },
      });
      if (!variant) throw new AppError("Gói sản phẩm không tồn tại hoặc đã bị tắt.", "VARIANT_NOT_FOUND", 400);
      return { itemName: row.name, catalogPrice: Number(variant.variantPrice), resolvedWarranty: variant.warranty };
    }

    return { itemName: row.name, catalogPrice: Number(row.price) };
  }
  throw new AppError("Loại đơn hàng không hợp lệ.", "INVALID_ORDER_TYPE", 400);
}
