import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me || (me.role !== "ADMIN" && me.role !== "STAFF")) {
    redirect("/");
  }

  const pendingOrderCount = await prisma.order.count({ where: { status: "PENDING" } });

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar pendingOrderCount={pendingOrderCount} />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
