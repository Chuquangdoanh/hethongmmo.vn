import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/rbac";
import { isValidLocalKey, readLocalFile } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const key = req.nextUrl.searchParams.get("key") ?? "";

    if (!isValidLocalKey(key)) {
      return new NextResponse("Not found", { status: 404 });
    }

    // STAFF/ADMIN xem được mọi file; user thường chỉ xem file của chính mình
    // key format: cccd/{userId}/{filename} — parts[1] là userId
    const isStaff = me.role === "ADMIN" || me.role === "STAFF";
    if (!isStaff) {
      const ownerId = key.split("/")[1];
      if (ownerId !== me.id) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    let buffer: Buffer;
    let contentType: string;
    try {
      ({ buffer, contentType } = await readLocalFile(key));
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
}
