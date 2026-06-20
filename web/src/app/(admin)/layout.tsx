import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { getUserPermissions } from "@/lib/services/permission.service";
import { AdminPermissionProvider } from "@/components/admin/PermissionProvider";
import AdminSidebar from "./_components/AdminSidebar";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import type { PermissionCode } from "@/lib/constants/modules";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || (me.role !== "ADMIN" && me.role !== "STAFF")) {
    redirect("/");
  }

  const isAdmin = me.role === "ADMIN";

  const [pendingOrderCount, staffPermissions] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    // ADMIN: null (bypass). STAFF: fetch their individual permissions.
    isAdmin
      ? Promise.resolve(null)
      : getUserPermissions(me.id),
  ]);

  const permissionList: PermissionCode[] = staffPermissions ?? [];

  return (
    <AdminPermissionProvider isAdmin={isAdmin} permissions={permissionList}>
      <div className="min-h-screen flex bg-gray-50">
        <AdminSidebar
          pendingOrderCount={pendingOrderCount}
          permissions={staffPermissions}
          isAdmin={isAdmin}
        />
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 flex-1">
            <PageTransitionWrapper>{children}</PageTransitionWrapper>
          </div>
        </main>
      </div>
    </AdminPermissionProvider>
  );
}
