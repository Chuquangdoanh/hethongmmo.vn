import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { getDisabledPageKeys } from "@/lib/services/page-permission.service";
import AdminSidebar from "./_components/AdminSidebar";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || (me.role !== "ADMIN" && me.role !== "STAFF")) {
    redirect("/");
  }

  const [pendingOrderCount, staffDisabledPages] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    // For STAFF: fetch which pages are disabled so sidebar can hide them.
    // ADMIN gets null (no restrictions).
    me.role === "STAFF"
      ? getDisabledPageKeys("STAFF")
      : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar
        pendingOrderCount={pendingOrderCount}
        disabledPages={staffDisabledPages}
        isAdmin={me.role === "ADMIN"}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 flex-1">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </div>
      </main>
    </div>
  );
}
