import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { denySession } from "@/lib/auth/session-denylist";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function POST(): Promise<NextResponse> {
  const session = await auth();

  if (session?.user?.jti) {
    await denySession(session.user.jti, SESSION_MAX_AGE);
  }

  // Clear Auth.js cookie (both dev and prod names)
  const cookieStore = await cookies();
  cookieStore.delete("authjs.session-token");
  cookieStore.delete("__Secure-authjs.session-token");

  return NextResponse.json({ success: true });
}
