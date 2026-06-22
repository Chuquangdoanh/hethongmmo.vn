import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export const MAX_IMPORT_ITEMS = 5000;
const MAX_ERRORS_RETURNED = 500;

const addStockSchema = z.object({
  items: z
    .array(z.string().min(1).max(2000))
    .min(1, "Cần ít nhất 1 item")
    .max(MAX_IMPORT_ITEMS, `Tối đa ${MAX_IMPORT_ITEMS} items mỗi lần`),
});

const PAGE_SIZE = 30;

type DuplicateType = "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";

interface ImportError {
  line: number;
  value: string;
  type: DuplicateType;
  detail: string;
}

// ── GET — List stock items (decrypted) ──────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);

    const rawStatus = req.nextUrl.searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));

    const statusFilter =
      rawStatus === "AVAILABLE" ? { status: "AVAILABLE" as const } :
      rawStatus === "SOLD"      ? { status: "SOLD" as const } :
      {};

    const where = { productId: id, ...statusFilter };

    const [rows, total] = await Promise.all([
      prisma.sellerProductStock.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          contentEnc: true,
          status: true,
          soldAt: true,
          createdAt: true,
        },
      }),
      prisma.sellerProductStock.count({ where }),
    ]);

    const items = rows.map((r) => {
      let content = "[Không thể đọc nội dung]";
      try { content = decrypt(r.contentEnc as unknown as Buffer); } catch { /* decrypt failure */ }
      return {
        id: r.id,
        content,
        status: r.status,
        soldAt: r.soldAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return apiOk({
      items,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    return apiCatch(err);
  }
}

// ── POST — Add stock items with duplicate detection ──────────────────────────
//
// Checks 2 types of duplicates:
//   1. DUPLICATE_IN_FILE  — same value appears multiple times in the uploaded list
//   2. DUPLICATE_IN_DATABASE — value already exists in this product's stock
//
// Only inserts valid (non-duplicate) items. Returns detailed per-line error info.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = addStockSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    // IDOR: only seller who owns the product
    const product = await prisma.sellerProduct.findFirst({
      where: { id, sellerId: me.id, deletedAt: null },
      select: { id: true, isRestricted: true },
    });
    if (!product) return apiError("Sản phẩm không tồn tại", "NOT_FOUND", 404);
    if (product.isRestricted) return apiError("Sản phẩm đang bị hạn chế", "RESTRICTED", 403);

    const rawItems = parsed.data.items;
    const errors: ImportError[] = [];

    // ── Step 1: Detect in-file duplicates ──────────────────────────────────
    // Map value → first line number (1-based) seen
    const seenInFile = new Map<string, number>();
    const validAfterFileDedup: Array<{ value: string; lineNumber: number }> = [];

    for (let i = 0; i < rawItems.length; i++) {
      const value = (rawItems[i] ?? "").trim();
      const lineNum = i + 1;
      if (!value) continue;

      const firstOccurrence = seenInFile.get(value);
      if (firstOccurrence !== undefined) {
        errors.push({
          line: lineNum,
          value,
          type: "DUPLICATE_IN_FILE",
          detail: `Trùng với dòng ${firstOccurrence} trong file`,
        });
      } else {
        seenInFile.set(value, lineNum);
        validAfterFileDedup.push({ value, lineNumber: lineNum });
      }
    }

    // ── Step 2: Build existing content Set by decrypting current stock ──────
    const existingRows = await prisma.sellerProductStock.findMany({
      where: { productId: id },
      select: { contentEnc: true },
    });

    const existingSet = new Set<string>();
    for (const row of existingRows) {
      try {
        existingSet.add(decrypt(row.contentEnc as unknown as Buffer));
      } catch {
        // skip items that cannot be decrypted
      }
    }

    // ── Step 3: Check valid items against existing DB content ───────────────
    const validItems: string[] = [];

    for (const { value, lineNumber } of validAfterFileDedup) {
      if (existingSet.has(value)) {
        errors.push({
          line: lineNumber,
          value,
          type: "DUPLICATE_IN_DATABASE",
          detail: "Dữ liệu đã tồn tại trong kho",
        });
      } else {
        validItems.push(value);
        // Add to set immediately to catch if the same value appears twice in this upload
        // (redundant with step 1 but guards against edge cases)
        existingSet.add(value);
      }
    }

    // ── Step 4: Bulk insert valid items ────────────────────────────────────
    let insertedCount = 0;
    if (validItems.length > 0) {
      const encryptedItems = validItems.map((item) => ({
        productId: id,
        contentEnc: encrypt(item) as unknown as Uint8Array<ArrayBuffer>,
      }));
      const result = await prisma.sellerProductStock.createMany({ data: encryptedItems });
      insertedCount = result.count;
    }

    const duplicateInFile = errors.filter((e) => e.type === "DUPLICATE_IN_FILE").length;
    const duplicateInDatabase = errors.filter((e) => e.type === "DUPLICATE_IN_DATABASE").length;

    return apiOk({
      totalRows: rawItems.length,
      validRows: validItems.length,
      insertedRows: insertedCount,
      duplicateInFile,
      duplicateInDatabase,
      totalErrors: errors.length,
      errors: errors.slice(0, MAX_ERRORS_RETURNED),
    });
  } catch (err) {
    return apiCatch(err);
  }
}
