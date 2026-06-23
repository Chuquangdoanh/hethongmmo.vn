import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { processDeposit } from "@/lib/services/deposit.service";
import { apiOk, apiCatch, apiValidationError, apiError } from "@/lib/api-response";
import { DuplicateError } from "@/lib/errors";

export const runtime = "nodejs";

const resolveSchema = z.object({
  userEmail: z.string().email("Email không hợp lệ"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
 await requirePermission(session, "finance:approve");

    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { userEmail } = parsed.data;

    const [transfer, user] = await Promise.all([
      prisma.unmatchedTransfer.findUnique({
        where: { id },
        select: { id: true, referenceCode: true, amount: true, content: true, status: true, rawPayload: true },
      }),
      prisma.user.findFirst({
        where: { email: userEmail, deletedAt: null },
        select: { id: true, email: true },
      }),
    ]);

    if (!transfer) return apiError("Không tìm thấy giao dịch", "NOT_FOUND", 404);
    if (transfer.status === "RESOLVED") return apiError("Giao dịch này đã được xử lý", "ALREADY_RESOLVED", 409);
    if (!user) return apiError("Không tìm thấy user với email này", "USER_NOT_FOUND", 404);

    const raw = transfer.rawPayload as Record<string, unknown>;

    try {
      await processDeposit({
        userId: user.id,
        amount: Number(transfer.amount),
        referenceCode: transfer.referenceCode,
        description: `Admin gán thủ công: ${transfer.content.slice(0, 200)}`,
        type: "DEPOSIT_MANUAL",
        transactionDate: typeof raw.transactionDate === "string" ? raw.transactionDate : undefined,
        accountNumber: typeof raw.accountNumber === "string" ? raw.accountNumber : undefined,
        metadata: {
          gateway: typeof raw.gateway === "string" ? raw.gateway : "unknown",
          resolvedBy: me.id,
          unmatchedTransferId: transfer.id,
        },
      });
    } catch (err) {
      if (err instanceof DuplicateError) {
        return apiError("referenceCode này đã được xử lý trước đó", "DUPLICATE_REFERENCE", 409);
      }
      throw err;
    }

    await prisma.unmatchedTransfer.update({
      where: { id },
      data: { status: "RESOLVED", resolvedByUserId: me.id, resolvedAt: new Date() },
    });

    return apiOk({ resolvedForEmail: user.email, amount: Number(transfer.amount) });
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireStaff(session);
    await requirePermission(session, "finance:approve");

    const { id } = await params;

    const transfer = await prisma.unmatchedTransfer.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!transfer) return apiError("Không tìm thấy giao dịch", "NOT_FOUND", 404);
    if (transfer.status !== "PENDING") return apiError("Giao dịch này đã được xử lý", "ALREADY_RESOLVED", 409);

    await prisma.unmatchedTransfer.update({
      where: { id },
      data: { status: "DISMISSED", resolvedByUserId: me.id, resolvedAt: new Date() },
    });

    return apiOk({ dismissed: true });
  } catch (err) {
    return apiCatch(err);
  }
}
