"use client";

import { useCallback, useRef } from "react";

// Phát âm thanh thông báo (CRUD tại CMS). Bắt lỗi autoplay policy của trình duyệt —
// nếu trang chưa có tương tác nào từ người dùng, play() sẽ reject, ta bỏ qua im lặng
// thay vì throw lên UI.
export function useNotificationSound(soundUrl: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!soundUrl) return;
    if (!audioRef.current || audioRef.current.src !== soundUrl) {
      audioRef.current = new Audio(soundUrl);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => { /* autoplay bị chặn — bỏ qua */ });
  }, [soundUrl]);

  return play;
}
