import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import StickyHeaderWrapper from "@/components/layout/StickyHeaderWrapper";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/dang-nhap");

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
