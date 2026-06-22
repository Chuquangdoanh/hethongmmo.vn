import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { requireStaff, AppAuthError } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/security/audit";
import { logger } from "@/lib/utils/logger";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LINES = 10_000;
const MAX_ITEM_LENGTH = 10_000;

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
 * Import kho bằng file .txt — kiểm tra trùng trong file và với DB.
 *
 * Query: ?preview=true → phân tích mà không insert (xem trước kết quả)
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

    const preview = req.nextUrl.searchParams.get("preview") === "true";

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

    // ── Parse multipart form ──────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Không thể đọc form data", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Thiếu file upload", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      return NextResponse.json(
        { success: false, error: "Chỉ chấp nhận file .txt", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File quá lớn. Tối đa 10MB.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // ── Đọc và parse nội dung file ────────────────────────────────────
    let text: string;
    try {
      text = await file.text();
    } catch {
      return NextResponse.json(
        { success: false, error: "Không thể đọc file. Đảm bảo file mã hóa UTF-8.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const rawLines = text.split("\n");
    const parsedLines: ParsedLine[] = [];
    let totalRows = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const normalized = normalizeItem(rawLines[i] ?? "");
      if (!normalized) continue;
      totalRows++;
      if (normalized.length > MAX_ITEM_LENGTH) continue; // skip corrupt lines
      parsedLines.push({ lineNum: i + 1, value: normalized, hash: hashItem(normalized) });
    }

    if (parsedLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "File không có dữ liệu hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (parsedLines.length > MAX_LINES) {
      return NextResponse.json(
        {
          success: false,
          error: `File có ${parsedLines.length.toLocaleString("vi-VN")} dòng, vượt giới hạn ${MAX_LINES.toLocaleString("vi-VN")} dòng/lần.`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // ── Bước 1: Phát hiện trùng trong file ───────────────────────────
    const seenInFile = new Map<string, number>(); // hash → số dòng đầu tiên
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
        // skipDuplicates: safety net cho concurrent import — DB unique constraint ngăn nhân đôi
        const result = await tx.mmoProductItem.createMany({ data: records, skipDuplicates: true });
        insertedRows = result.count;
      });

      logger.info(
        { productId: id, totalRows, insertedRows, staffId: actor.id, fileName: file.name },
        "MMO stock import",
      );

      await writeAuditLog({
        actorId: actor.id,
        action: "MMO_STOCK_IMPORT",
        targetType: "MmoProduct",
        targetId: id,
        after: {
          fileName: file.name,
          totalRows,
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
        totalRows,
        validRows: validItems.length,
        insertedRows,
        duplicateInFile: duplicateInFileErrors.length,
        duplicateInDatabase: duplicateInDatabaseErrors.length,
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
