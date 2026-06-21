import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { AppAuthError } from "@/lib/auth/rbac";
import { processDeposit } from "@/lib/services/deposit.service";
import { toApiError } from "@/lib/errors";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const depositSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().min(1000, "Tối thiểu 1,000đ").max(100_000_000, "Tối đa 100,000,000đ"),
  description: z.string().min(1).max(500),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { userId, amount, description } = parsed.data;

    // Generate a unique reference code for manual deposits
    const referenceCode = `MANUAL-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;

    const transaction = await processDeposit({
      userId,
      amount,
      referenceCode,
      description,
      type: "DEPOSIT_MANUAL",
      metadata: { adminId: admin.id, adminEmail: admin.email ?? "" },
    });

    return NextResponse.json({ data: { transactionId: transaction.id, referenceCode } }, { status: 201 });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
