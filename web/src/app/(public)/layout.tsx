import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Ticker from "@/components/layout/Ticker";
import StickyContactMenuLoader from "@/components/shared/StickyContactMenuLoader";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import StickyHeaderWrapper from "@/components/layout/StickyHeaderWrapper";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StickyHeaderWrapper>
        <Header />
        <Ticker />
      </StickyHeaderWrapper>
      <main className="flex flex-col flex-1">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>
      <Footer />
      <StickyContactMenuLoader />
    </>
  );
}
