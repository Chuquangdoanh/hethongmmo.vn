import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { getPermissionsForRole } from "@/lib/services/page-permission.service";
import { getPublicPageConfigs } from "@/lib/services/public-page-config.service";
import { PAGE_REGISTRY } from "@/lib/page-registry";
import { listStaffMembers } from "@/lib/services/staff-permission.service";
import PermissionManager from "./_components/PermissionManager";

export const metadata = { title: "Phân quyền | Admin" };

export default async function PagePermissionsPage() {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || me.role !== "ADMIN") redirect("/admin/dashboard");

  // Note: STAFF page permissions (role-based) were replaced by per-user
  // module:action permissions in Phase 3. Only USER and SELLER tabs remain
  // using the old role-based system.
  const [userPerms, sellerPerms, publicConfigs, staffMembers] = await Promise.all([
    getPermissionsForRole("USER"),
    getPermissionsForRole("SELLER"),
    getPublicPageConfigs(),
    listStaffMembers(),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phân quyền</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phân quyền tác vụ cho từng nhân viên và kiểm soát hiển thị trang cho người dùng / nhà bán hàng.
        </p>
      </div>

      <PermissionManager
        registry={PAGE_REGISTRY}
        initialUser={userPerms}
        initialSeller={sellerPerms}
        initialPublicConfigs={publicConfigs}
        staffMembers={staffMembers}
      />
    </div>
  );
}
