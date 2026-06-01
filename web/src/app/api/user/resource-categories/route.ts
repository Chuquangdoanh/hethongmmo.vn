import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireUser(session);

    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, iconUrl: true },
    });

    return apiOk(categories);
  } catch (err) {
    return apiCatch(err);
  }
}
