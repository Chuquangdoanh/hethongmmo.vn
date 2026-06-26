import DisclaimerPopup from "@/components/shared/DisclaimerPopup";

export default function TaiNguyenMmoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DisclaimerPopup />
      {children}
    </>
  );
}
