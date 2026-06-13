import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session);

    const { id, subId } = await params;
    const request = await prisma.sellerRequest.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!request) return NextResponse.json({ error: "Không tìm thấy yêu cầu", code: "NOT_FOUND" }, { status: 404 });

    await prisma.userSubCategory.deleteMany({
      where: {
        userId: request.userId,
        subCategoryId: subId,
      },
    });

    return apiOk({ success: true });
  } catch (err) {
    return apiCatch(err);
  }
}
