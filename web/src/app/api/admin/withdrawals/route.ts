import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED"]).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = req.nextUrl;
    const query = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!query.success) {
      return NextResponse.json({ error: "Tham số không hợp lệ", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { page, limit, status } = query.data;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [withdrawals, total] = await Promise.all([
      prisma.sellerWithdrawal.findMany({
        where,
        select: {
          id: true,
          sellerId: true,
          amount: true,
          feePercent: true,
          feeAmount: true,
          netAmount: true,
          status: true,
          rejectReason: true,
          processedAt: true,
          createdAt: true,
          bankNameEnc: true,
          bankAccountNumberEnc: true,
          bankAccountHolderEnc: true,
          seller: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sellerWithdrawal.count({ where }),
    ]);

    // Decrypt bank info for admin display
    const data = withdrawals.map(({ bankNameEnc, bankAccountNumberEnc, bankAccountHolderEnc, ...rest }) => ({
      ...rest,
      bankName: bankNameEnc ? decrypt(bankNameEnc as unknown as Buffer) : null,
      bankAccountNumber: bankAccountNumberEnc ? decrypt(bankAccountNumberEnc as unknown as Buffer) : null,
      bankAccountHolder: bankAccountHolderEnc ? decrypt(bankAccountHolderEnc as unknown as Buffer) : null,
    }));

    return NextResponse.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
