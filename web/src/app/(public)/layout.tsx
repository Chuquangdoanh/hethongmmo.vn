import Header from "@/components/layout/Header";
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
      <StickyHeaderWrapper>
        <Header />
        <div className="hdr-ticker-pop">
          <Ticker />
        </div>
      </StickyHeaderWrapper>
      <div className="hdr-content-shift hdr-content-shift--with-ticker flex flex-col flex-1">
        <main className="flex flex-col flex-1">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <Footer />
        <StickyContactMenuLoader />
      </div>
    </>
  );
}
