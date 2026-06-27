import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireSeller } from "@/lib/auth/rbac";
import { depositEscrowSchema } from "@/lib/validation/escrow.schema";
import { depositSellerEscrow } from "@/lib/services/wallet.service";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireSeller(session);

    const body: unknown = await req.json();
    const parsed = depositEscrowSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await depositSellerEscrow({ sellerId: me.id, amount: parsed.data.amount });

    return apiOk({ message: "Nạp ký quỹ thành công" });
  } catch (err) {
    return apiCatch(err);
  }
}
