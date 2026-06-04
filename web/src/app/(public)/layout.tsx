import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Ticker from "@/components/layout/Ticker";
import StickyContactMenuLoader from "@/components/shared/StickyContactMenuLoader";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="sticky top-0 z-998">
        <Header />
        <Ticker />
      </div>
      <main className="flex flex-col flex-1">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>
      <Footer />
      <StickyContactMenuLoader />
    </>
  );
}
