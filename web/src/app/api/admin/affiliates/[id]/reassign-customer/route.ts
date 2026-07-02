import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { reassignCustomerSchema } from "@/lib/validation/affiliate.schema";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

/**
 * The ONLY route allowed to mutate referrerAffiliateId after first-touch creation.
 * Admin-only, per the "lifetime attribution" requirement.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    const admin = requireAdmin(session);
    await params; // affiliateId in the URL is informational only — the mutation targets customerId

    const body: unknown = await req.json();
    const parsed = reassignCustomerSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { customerId, newAffiliateId } = parsed.data;

    const customer = await prisma.user.findUnique({ where: { id: customerId }, select: { referrerAffiliateId: true } });
    if (!customer) throw new NotFoundError("Customer");

    await prisma.user.update({
      where: { id: customerId },
      data: { referrerAffiliateId: newAffiliateId, affiliateJoinedAt: newAffiliateId ? new Date() : null },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "AFFILIATE_CUSTOMER_REASSIGNED",
      targetType: "User",
      targetId: customerId,
      before: { referrerAffiliateId: customer.referrerAffiliateId },
      after: { referrerAffiliateId: newAffiliateId },
    });

    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
