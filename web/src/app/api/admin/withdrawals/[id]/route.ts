import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { processWithdrawal, completeWithdrawal } from "@/lib/services/withdrawal.service";
import { sendWithdrawalEmail } from "@/lib/services/email.service";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const processSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), rejectReason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("complete") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireStaff(session);
 await requirePermission(session, "finance:approve");
    const { id } = await params;

    const body: unknown = await req.json();
    const parsed = processSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { action } = parsed.data;

    if (action === "complete") {
      await completeWithdrawal({ withdrawalId: id, adminUserId: admin.id });

      const withdrawal = await prisma.sellerWithdrawal.findUnique({
        where: { id },
        select: { netAmount: true, seller: { select: { email: true } } },
      });
      if (withdrawal) {
        sendWithdrawalEmail({
          to: withdrawal.seller.email,
          netAmount: withdrawal.netAmount.toString(),
          status: "COMPLETED",
        }).catch(() => {});
      }
    } else {
      const rejectReason = action === "reject" ? parsed.data.rejectReason : undefined;

      await processWithdrawal({
        withdrawalId: id,
        adminUserId: admin.id,
        approve: action === "approve",
        rejectReason,
      });

      const withdrawal = await prisma.sellerWithdrawal.findUnique({
        where: { id },
        select: { netAmount: true, seller: { select: { email: true } } },
      });
      if (withdrawal) {
        sendWithdrawalEmail({
          to: withdrawal.seller.email,
          netAmount: withdrawal.netAmount.toString(),
          status: action === "approve" ? "APPROVED" : "REJECTED",
          rejectReason,
        }).catch(() => {});
      }
    }

    return apiSuccess();
  } catch (err) {
    return apiCatch(err);
  }
}
