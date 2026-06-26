import DisclaimerPopup from "@/components/shared/DisclaimerPopup";

export default function KhoTaiNguyenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DisclaimerPopup />
      {children}
    </>
  );
}
