import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import StickyHeaderWrapper from "@/components/layout/StickyHeaderWrapper";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;

  if (!me) redirect("/dang-nhap");
  if (me.role !== "SELLER" && me.role !== "STAFF" && me.role !== "ADMIN") {
    redirect("/");
  }
  // SELLER role must be APPROVED — STAFF/ADMIN bypass this check
  if (me.role === "SELLER" && me.sellerStatus !== "APPROVED") {
    redirect("/");
  }

  return (
    <>
      <StickyHeaderWrapper>
        <Header />
      </StickyHeaderWrapper>
      <div className="hdr-content-shift flex flex-col flex-1">
        <main className="flex flex-col flex-1 mx-auto max-w-7xl w-full px-4 md:px-6 lg:px-8 py-8">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <Footer />
      </div>
    </>
  );
}
