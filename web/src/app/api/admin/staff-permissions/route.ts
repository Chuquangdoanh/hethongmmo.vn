import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";
import { listStaffMembers, setStaffPermissions } from "@/lib/services/staff-permission.service";
import { ALL_STAFF_PERMISSIONS, type StaffPermissionKey } from "@/lib/constants/staff-permissions";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  userId:      z.string().uuid(),
  permissions: z.array(z.string()).transform((arr) =>
    arr.filter((p): p is StaffPermissionKey =>
      (ALL_STAFF_PERMISSIONS as string[]).includes(p)
    )
  ),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const members = await listStaffMembers();
    return apiOk(members);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    await setStaffPermissions(parsed.data.userId, parsed.data.permissions, me.id);
    return apiOk({ updated: true });
  } catch (err) {
    return apiCatch(err);
  }
}
