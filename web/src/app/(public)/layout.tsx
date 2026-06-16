import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Ticker from "@/components/layout/Ticker";
import StickyContactMenuLoader from "@/components/shared/StickyContactMenuLoader";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import StickyHeaderWrapper from "@/components/layout/StickyHeaderWrapper";
import ScrollRestorer from "@/components/layout/ScrollRestorer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollRestorer />
      <Sidebar />
      <div className="sb-content-shift flex flex-col flex-1">
        <StickyHeaderWrapper>
          <Header />
          <Ticker />
        </StickyHeaderWrapper>
        <main className="flex flex-col flex-1">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <Footer />
        <StickyContactMenuLoader />
      </div>
    </>
  );
}
