import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { NotFoundError } from "@/lib/errors";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);
    const { id } = await params;

    const withdrawal = await prisma.affiliateWithdrawal.findUnique({
      where: { id },
      select: { bankNameEnc: true, bankAccountNumberEnc: true, bankAccountHolderEnc: true },
    });
    if (!withdrawal) throw new NotFoundError("Withdrawal");

    return apiOk({
      bankName:          withdrawal.bankNameEnc          ? decrypt(withdrawal.bankNameEnc          as unknown as Buffer) : null,
      bankAccountNumber: withdrawal.bankAccountNumberEnc ? decrypt(withdrawal.bankAccountNumberEnc as unknown as Buffer) : null,
      bankAccountHolder: withdrawal.bankAccountHolderEnc ? decrypt(withdrawal.bankAccountHolderEnc as unknown as Buffer) : null,
    });
  } catch (err) {
    return apiCatch(err);
  }
}
