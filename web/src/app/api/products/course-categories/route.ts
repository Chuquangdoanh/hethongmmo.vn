import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await prisma.courseCategory.findMany({
      select: { id: true, name: true, icon: true, displayOrder: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: categories });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
