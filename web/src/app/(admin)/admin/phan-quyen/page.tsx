import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { getPermissionsForRole } from "@/lib/services/page-permission.service";
import { getPublicPageConfigs } from "@/lib/services/public-page-config.service";
import { PAGE_REGISTRY } from "@/lib/page-registry";
import { listStaffMembers } from "@/lib/services/staff-permission.service";
import PermissionManager from "./_components/PermissionManager";

export const metadata = { title: "Phân quyền trang | Admin" };

export default async function PagePermissionsPage() {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || me.role !== "ADMIN") redirect("/admin/dashboard");

  const [staffPerms, userPerms, sellerPerms, publicConfigs, staffMembers] = await Promise.all([
    getPermissionsForRole("STAFF"),
    getPermissionsForRole("USER"),
    getPermissionsForRole("SELLER"),
    getPublicPageConfigs(),
    listStaffMembers(),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phân quyền truy cập trang</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bật / tắt quyền truy cập từng trang và chức năng CRUD cho từng nhóm. Thay đổi có hiệu lực ngay lập tức.
        </p>
      </div>

      <PermissionManager
        registry={PAGE_REGISTRY}
        initialStaff={staffPerms}
        initialUser={userPerms}
        initialSeller={sellerPerms}
        initialPublicConfigs={publicConfigs}
        staffMembers={staffMembers}
      />
    </div>
  );
}
