import type { ReactNode } from "react";
import AuthTabs from "./AuthTabs";

export default function AuthRightPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full lg:w-[40%] p-4 lg:px-8 lg:py-6"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        flexShrink: 0,
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        background: "#fff",
        borderRadius: 22,
        boxShadow: "0 8px 48px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <AuthTabs />
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px 40px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
