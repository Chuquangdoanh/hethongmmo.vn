import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "@/lib/services/notification.service";
import { toApiError, NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("markOne"), notificationId: z.string().uuid() }),
  z.object({ action: z.literal("markAll") }),
]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const [{ data, total }, unreadCount] = await Promise.all([
      getUserNotifications(me.id, page, limit),
      getUnreadCount(me.id),
    ]);

    return NextResponse.json({
      data,
      meta: { total, page, limit, unreadCount, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (parsed.data.action === "markOne") {
      await markAsRead(parsed.data.notificationId, me.id);
    } else {
      await markAllAsRead(me.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
