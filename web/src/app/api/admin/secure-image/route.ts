import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { isValidLocalKey, readLocalFile } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireStaff(session); // STAFF và ADMIN đều có thể xem ảnh CCCD/portrait

    const key = req.nextUrl.searchParams.get("key") ?? "";

    if (!isValidLocalKey(key)) {
      return new NextResponse("Not found", { status: 404 });
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
