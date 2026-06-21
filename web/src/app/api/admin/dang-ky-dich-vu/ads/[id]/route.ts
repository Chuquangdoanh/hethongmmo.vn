import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "sellers:update");

    const { id } = await params;
    const body = await req.json() as { status?: string; note?: string };

    if (!body.status || !["PENDING", "DONE"].includes(body.status)) {
      return apiError("Status không hợp lệ", "INVALID_STATUS", 400);
    }

    const updated = await prisma.adsRegistration.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.note !== undefined ? { note: body.note || null } : {}),
      },
      select: { id: true, status: true, note: true },
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
