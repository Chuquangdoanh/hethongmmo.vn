import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { ROLE_LEVELS } from "@/lib/auth/rbac";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import StickyHeaderWrapper from "@/components/layout/StickyHeaderWrapper";

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me) redirect("/dang-nhap");
  const canView = ROLE_LEVELS[me.role] >= ROLE_LEVELS.STAFF || (me.isAffiliate === true && me.affiliateStatus === "ACTIVE");
  if (!canView) redirect("/");

  return (
    <>
      <Sidebar />
      <div className="sb-content-shift flex flex-col flex-1">
        <StickyHeaderWrapper>
          <Header />
        </StickyHeaderWrapper>
        <main className="flex flex-col flex-1 mx-auto max-w-7xl w-full px-4 md:px-6 lg:px-8 py-8">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <Footer />
      </div>
    </>
  );
}
