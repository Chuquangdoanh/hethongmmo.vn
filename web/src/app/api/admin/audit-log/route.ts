import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
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

    const { page, limit, actorId, action, targetType, targetId } = query.data;
    const skip = (page - 1) * limit;

    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action: { contains: action } } : {}),
      ...(targetType ? { targetType } : {}),
      ...(targetId ? { targetId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorId: true,
          action: true,
          targetType: true,
          targetId: true,
          before: true,
          after: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
          actor: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
