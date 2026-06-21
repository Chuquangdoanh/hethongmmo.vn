import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const createSchema = z.object({
  text:         z.string().min(1).max(300).trim(),
  displayOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "content:create");

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const text = await prisma.tickerText.create({
      data: {
        text:         parsed.data.text,
        displayOrder: parsed.data.displayOrder ?? 0,
      },
    });

    return apiOk(text);
  } catch (err) {
    return apiCatch(err);
  }
}
