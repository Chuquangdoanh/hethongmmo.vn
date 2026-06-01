import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  text:     z.string().min(1).max(300).trim().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const existing = await prisma.tickerText.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("TickerText");

    const updated = await prisma.tickerText.update({
      where: { id },
      data: parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const existing = await prisma.tickerText.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("TickerText");

    await prisma.tickerText.delete({ where: { id } });
    return apiOk({ id });
  } catch (err) {
    return apiCatch(err);
  }
}
