import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);
    await requirePermission(session, "orders:read");
    const count = await prisma.order.count({ where: { status: "PENDING" } });
    return apiOk({ count });
  } catch (err) {
    return apiCatch(err);
  }
}
