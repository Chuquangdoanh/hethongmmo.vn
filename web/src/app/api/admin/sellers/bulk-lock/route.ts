import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  requestIds: z.array(z.string().uuid()).min(1).max(200),
  lock: z.boolean(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "sellers:update");

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { requestIds, lock } = parsed.data;

    const requests = await prisma.sellerRequest.findMany({
      where: { id: { in: requestIds }, status: "APPROVED" },
      select: { userId: true },
    });

    if (requests.length === 0) return apiOk({ updated: 0 });

    const userIds = requests.map((r) => r.userId);
    await prisma.$executeRaw`UPDATE users SET shop_locked = ${lock} WHERE id = ANY(${userIds}::uuid[])`;

    return apiOk({ updated: userIds.length });
  } catch (err) {
    return apiCatch(err);
  }
}
