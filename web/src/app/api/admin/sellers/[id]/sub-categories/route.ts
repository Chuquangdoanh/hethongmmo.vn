import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const addSchema = z.object({
  subCategoryId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    await requirePermission(session, "sellers:update");

    const { id } = await params;
    const request = await prisma.sellerRequest.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!request) return NextResponse.json({ error: "Không tìm thấy yêu cầu", code: "NOT_FOUND" }, { status: 404 });

    const body: unknown = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await prisma.userSubCategory.upsert({
      where: {
        userId_subCategoryId: {
          userId: request.userId,
          subCategoryId: parsed.data.subCategoryId,
        },
      },
      update: {},
      create: {
        userId: request.userId,
        subCategoryId: parsed.data.subCategoryId,
      },
    });

    return apiOk({ success: true });
  } catch (err) {
    return apiCatch(err);
  }
}
