import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { purchaseProduct } from "@/lib/services/purchase.service";
import { orderRatelimit, checkRateLimit } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors";
import { apiOk, apiList, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

const purchaseSchema = z.object({
  itemId: z.string().uuid("itemId phải là UUID hợp lệ"),
  orderType: z.enum(["SERVICE", "COURSE", "TUTTRICK", "MMO_PRODUCT", "SELLER_PRODUCT"]),
  warrantyVariant: z.string().max(200).optional(),
  deviceVariant: z.string().max(200).optional(),
  customerNote: z.string().max(5000).optional(),
  idempotencyKey: z.string().uuid("idempotencyKey phải là UUID"),
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

    // Rate limit: 5 purchases per minute per user
    const rl = await checkRateLimit(orderRatelimit, `orders:${me.id}`);
    if (!rl.success) {
      return apiError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", "RATE_LIMITED", 429);
    }

    const body: unknown = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { itemId, orderType, warrantyVariant, deviceVariant, customerNote, idempotencyKey } = parsed.data;

    const { itemName, finalPrice } = await resolveItem(orderType, itemId, deviceVariant, warrantyVariant);

    const result = await purchaseProduct({
      userId: me.id,
      orderType,
      itemId,
      itemName,
      finalPrice,
      idempotencyKey,
      warrantyVariant,
      customerNote,
    });

    return apiOk(
      {
        orderId: result.order.id,
        orderCode: result.order.orderCode,
        orderType: result.order.orderType,
        itemName: result.order.itemName,
        finalPrice: result.order.finalPrice,
        status: result.order.status,
        deliveredContent: result.deliveredContent,
        tutTrickDocs: result.tutTrickDocs ?? null,
      },
      201,
    );
  } catch (err) {
    return apiCatch(err);
  }
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
): Promise<{ itemName: string; finalPrice: number }> {
  if (orderType === "SERVICE") {
    const row = await prisma.service.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true, productList: true, warrantyOptions: true },
    });
    if (!row) throw new AppError("Dịch vụ không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);

    const deviceVariants = parseVariantArray(row.productList);
    let finalPrice = Number(row.price);
    let nameSuffix = "";

    if (deviceVariants.length > 0) {
      if (!deviceVariant) {
        throw new AppError("Vui lòng chọn thiết bị cần xử lý.", "DEVICE_REQUIRED", 400);
      }
      const variant = deviceVariants.find(v => v.name === deviceVariant);
      if (!variant) {
        throw new AppError("Thiết bị không hợp lệ, vui lòng chọn lại.", "INVALID_DEVICE", 400);
      }
      finalPrice = variant.price;
      nameSuffix = ` (${variant.name})`;
    }

    // Add warranty price server-side
    const warrantyOpts = parseVariantArray(row.warrantyOptions);
    if (warrantyVariant) {
      const wOption = warrantyOpts.find(w => w.name === warrantyVariant);
      if (wOption && wOption.price > 0) {
        finalPrice += wOption.price;
      }
    }

    return { itemName: row.name + nameSuffix, finalPrice };
  }
  if (orderType === "COURSE") {
    const row = await prisma.course.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, salePrice: true },
    });
    if (!row) throw new AppError("Khóa học không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, finalPrice: Number(row.salePrice) };
  }
  if (orderType === "TUTTRICK") {
    const row = await prisma.tutTrick.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Tài liệu không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, finalPrice: Number(row.price) };
  }
  if (orderType === "MMO_PRODUCT") {
    const row = await prisma.mmoProduct.findUnique({
      where: { id: itemId, isActive: true, deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Sản phẩm không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, finalPrice: Number(row.price) };
  }
  if (orderType === "SELLER_PRODUCT") {
    const row = await prisma.sellerProduct.findUnique({
      where: { id: itemId, isActive: true, isHidden: false, deletedAt: null },
      select: { name: true, price: true },
    });
    if (!row) throw new AppError("Sản phẩm không khả dụng hoặc đã bị tắt.", "ITEM_INACTIVE", 400);
    return { itemName: row.name, finalPrice: Number(row.price) };
  }
  throw new AppError("Loại đơn hàng không hợp lệ.", "INVALID_ORDER_TYPE", 400);
}
