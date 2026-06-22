import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_ITEMS = 10_000;

const importSchema = z.object({
  items:   z.array(z.string().min(1).max(10_000)).min(1).max(MAX_ITEMS),
  preview: z.boolean().optional().default(false),
});

type DuplicateType = "DUPLICATE_IN_FILE" | "DUPLICATE_IN_DATABASE";

interface ImportError {
  line: number;
  value: string;
  type: DuplicateType;
  detail: string;
}

interface ParsedLine {
  lineNum: number;
  value: string;
}

/**
 * POST /api/products/mmo/[id]/stock/import
 * Body: { items: string[], preview?: boolean }
 * Đọc từ client, check 2 loại trùng (trong file + DB), insert items hợp lệ.
 * preview=true → phân tích không insert.
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

    // Normalize và đánh số dòng
    const parsedLines: ParsedLine[] = [];
    for (let i = 0; i < parsed.data.items.length; i++) {
      const value = (parsed.data.items[i] ?? "").trim().replace(/\s+/g, " ");
      if (!value) continue;
      parsedLines.push({ lineNum: i + 1, value });
    }

    if (parsedLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có dữ liệu hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // ── Bước 1: Phát hiện trùng trong file ───────────────────────────
    const seenInFile = new Map<string, number>(); // value → lineNum đầu tiên
    const duplicateInFileErrors: ImportError[] = [];
    const uniqueLines: ParsedLine[] = [];

    for (const line of parsedLines) {
      const firstLine = seenInFile.get(line.value);
      if (firstLine !== undefined) {
        duplicateInFileErrors.push({
          line: line.lineNum,
          value: line.value,
          type: "DUPLICATE_IN_FILE",
          detail: `Trùng với dòng ${firstLine} trong file`,
        });
      } else {
        seenInFile.set(line.value, line.lineNum);
        uniqueLines.push(line);
      }
    }

    // ── Bước 2: Phát hiện trùng với kho DB (decrypt) ─────────────────
    // Lấy toàn bộ item của sản phẩm, decrypt để so sánh
    const existingRows = await prisma.mmoProductItem.findMany({
      where: { productId: id },
      select: { valueEnc: true },
    });

    const existingSet = new Set<string>();
    for (const row of existingRows) {
      try {
        existingSet.add(decrypt(row.valueEnc as Buffer));
      } catch {
        // skip unreadable items
      }
    }

    const duplicateInDatabaseErrors: ImportError[] = [];
    const validItems: ParsedLine[] = [];

    for (const line of uniqueLines) {
      if (existingSet.has(line.value)) {
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
        status: "AVAILABLE" as const,
      }));

      await prisma.$transaction(async (tx) => {
        const result = await tx.mmoProductItem.createMany({ data: records });
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
        totalErrors: allErrors.length,
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
