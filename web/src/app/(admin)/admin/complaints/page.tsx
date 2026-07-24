import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/permission-guard";
import AdminComplaintsTabs, { type ComplaintsAdminTab } from "./_components/AdminComplaintsTabs";
import ComplaintsTabContent from "./_components/ComplaintsTabContent";
import PreSaleChatsTabContent from "./_components/PreSaleChatsTabContent";
import SupportTicketsTabContent from "./_components/SupportTicketsTabContent";
import ChatViolationsTabContent from "./_components/ChatViolationsTabContent";

export const metadata: Metadata = { title: "Admin — Khiếu nại" };

const VALID_TABS: ComplaintsAdminTab[] = ["complaints", "presale", "support", "violations"];

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; status?: string; q?: string; source?: string; role?: string }>;
}) {
  const session = await auth();
  try { requireStaff(session); } catch { redirect("/"); }
  try { await requirePermission(session, "complaints:read"); } catch { redirect("/admin"); }

  const { tab, page, status, q, source, role } = await searchParams;
  const activeTab: ComplaintsAdminTab = VALID_TABS.includes(tab as ComplaintsAdminTab)
    ? (tab as ComplaintsAdminTab)
    : "complaints";

  return (
    <div className="space-y-6">
      <AdminComplaintsTabs active={activeTab} />

      {activeTab === "complaints" && <ComplaintsTabContent page={page} status={status} q={q} />}
      {activeTab === "presale" && <PreSaleChatsTabContent page={page} q={q} />}
      {activeTab === "support" && <SupportTicketsTabContent page={page} q={q} />}
      {activeTab === "violations" && <ChatViolationsTabContent page={page} source={source} role={role} />}
    </div>
  );
}
