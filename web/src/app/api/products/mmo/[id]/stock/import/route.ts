import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_ITEMS = 10_000;

const importSchema = z.object({
  items:   z.array(z.string().min(1).max(10_000)).min(1).max(MAX_ITEMS),
  preview: z.boolean().optional().default(false),
});

function normalizeItem(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function hashItem(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

interface ImportError {
  line: number;
  value: string;
  type: "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";
  detail: string;
}

interface ParsedLine {
  lineNum: number;
  value: string;
  hash: string;
}

/**
 * POST /api/products/mmo/[id]/stock/import
 * Body: { items: string[], preview?: boolean }
 * Nhận mảng items đã đọc sẵn từ client.
 * - preview=true  → phân tích không insert
 * - preview=false → insert các item hợp lệ
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const actor = requireStaff(session);
    await requirePermission(session, "resources:update");
    const { id } = await params;

    // ── Validate product ──────────────────────────────────────────────
    const product = await prisma.mmoProduct.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, isActive: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm MMO không tồn tại", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: "Sản phẩm hiện không hoạt động", code: "ITEM_INACTIVE" },
        { status: 400 },
      );
    }

    // ── Parse JSON body ───────────────────────────────────────────────
    const body: unknown = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { preview } = parsed.data;

    // Normalize và đánh số dòng (line number là thứ tự trong mảng gốc từ client)
    const parsedLines: ParsedLine[] = [];
    for (let i = 0; i < parsed.data.items.length; i++) {
      const normalized = normalizeItem(parsed.data.items[i] ?? "");
      if (!normalized) continue;
      parsedLines.push({ lineNum: i + 1, value: normalized, hash: hashItem(normalized) });
    }

    if (parsedLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có dữ liệu hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // ── Bước 1: Phát hiện trùng trong file ───────────────────────────
    const seenInFile = new Map<string, number>(); // hash → lineNum đầu tiên
    const duplicateInFileErrors: ImportError[] = [];
    const uniqueLines: ParsedLine[] = [];

    for (const line of parsedLines) {
      const firstLine = seenInFile.get(line.hash);
      if (firstLine !== undefined) {
        duplicateInFileErrors.push({
          line: line.lineNum,
          value: line.value,
          type: "DUPLICATE_IN_FILE",
          detail: `Trùng với dòng ${firstLine} trong file`,
        });
      } else {
        seenInFile.set(line.hash, line.lineNum);
        uniqueLines.push(line);
      }
    }

    // ── Bước 2: Phát hiện trùng với kho DB ───────────────────────────
    const hashesToCheck = uniqueLines.map((l) => l.hash);
    const existingItems = await prisma.mmoProductItem.findMany({
      where: { productId: id, valueHash: { in: hashesToCheck } },
      select: { valueHash: true },
    });
    const existingHashSet = new Set(
      existingItems.map((e) => e.valueHash).filter((h): h is string => h !== null),
    );

    const duplicateInDatabaseErrors: ImportError[] = [];
    const validItems: ParsedLine[] = [];

    for (const line of uniqueLines) {
      if (existingHashSet.has(line.hash)) {
        duplicateInDatabaseErrors.push({
          line: line.lineNum,
          value: line.value,
          type: "DUPLICATE_IN_DATABASE",
          detail: "Dữ liệu đã tồn tại trong kho",
        });
      } else {
        validItems.push(line);
      }
    }

    // ── Bước 3: Bulk insert (chỉ khi không phải preview) ─────────────
    let insertedRows = 0;

    if (!preview && validItems.length > 0) {
      const records = validItems.map((item) => ({
        productId: id,
        valueEnc: encrypt(item.value) as unknown as Uint8Array<ArrayBuffer>,
        valueHash: item.hash,
        status: "AVAILABLE" as const,
      }));

      await prisma.$transaction(async (tx) => {
        const result = await tx.mmoProductItem.createMany({ data: records, skipDuplicates: true });
        insertedRows = result.count;
      });

      logger.info(
        { productId: id, totalRows: parsedLines.length, insertedRows, staffId: actor.id },
        "MMO stock import",
      );

      await writeAuditLog({
        actorId: actor.id,
        action: "MMO_STOCK_IMPORT",
        targetType: "MmoProduct",
        targetId: id,
        after: {
          totalRows: parsedLines.length,
          insertedRows,
          duplicateInFile: duplicateInFileErrors.length,
          duplicateInDatabase: duplicateInDatabaseErrors.length,
        },
      });
    }

    const allErrors = [...duplicateInFileErrors, ...duplicateInDatabaseErrors].sort(
      (a, b) => a.line - b.line,
    );

    const totalErrors = allErrors.length;

    return NextResponse.json({
      success: true,
      message: preview ? "Kết quả xem trước (chưa nhập kho)" : "Import kho hoàn tất",
      data: {
        preview,
        totalRows: parsedLines.length,
        validRows: validItems.length,
        insertedRows,
        duplicateInFile: duplicateInFileErrors.length,
        duplicateInDatabase: duplicateInDatabaseErrors.length,
        totalErrors,
        errors: allErrors,
      },
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    const e = toApiError(err);
    logger.error({ err }, "MMO stock import error");
    return NextResponse.json({ success: false, error: e.error, code: e.code }, { status: e.statusCode });
  }
}
