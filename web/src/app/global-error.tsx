"use client";

import { useEffect, useState } from "react";

function isStaleDeployment(error: Error & { digest?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("failed to find server action") ||
    msg.includes("older or newer deployment")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [countdown, setCountdown] = useState(3);
  const stale = isStaleDeployment(error);

  useEffect(() => {
    if (stale) {
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            window.location.reload();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error.digest ?? "no-digest");
    } else {
      console.error(error);
    }
  }, [error, stale]);

  return (
    <html lang="vi">
      <body style={{ margin: 0, background: "#0D0D14", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "0 1rem" }}>
          <h1 style={{ color: "#F4F4F5", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {stale ? "Trang đã được cập nhật" : "Có lỗi xảy ra"}
          </h1>
          <p style={{ color: "#71717A", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {stale
              ? `Đang tải lại trong ${countdown} giây...`
              : "Vui lòng thử lại hoặc liên hệ hỗ trợ."}
          </p>
          <button
            onClick={() => stale ? window.location.reload() : reset()}
            style={{ padding: "0.5rem 1rem", background: "#7C3AED", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            {stale ? "Tải lại ngay" : "Thử lại"}
          </button>
        </div>
      </body>
    </html>
  );
}
