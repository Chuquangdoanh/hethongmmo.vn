"use client";

import { useEffect } from "react";
import { useNotificationSound } from "@/lib/hooks/useNotificationSound";

interface Props {
  soundUrl: string | null;
}

// Phát âm thanh thông báo khi user chuyển sang tab khác rồi quay lại (visibilitychange).
// Chỉ mount ở các trang thuộc mục Hỗ trợ (Đơn hàng, Ticket hỗ trợ) — không áp dụng toàn site.
export default function ReturnTabSound({ soundUrl }: Props) {
  const play = useNotificationSound(soundUrl);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") play();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [play]);

  return null;
}
