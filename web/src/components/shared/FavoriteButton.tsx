"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import type { FavoriteProductTypeValue } from "@/lib/validation/favorite.schema";

interface FavoriteButtonProps {
  productId:        string;
  productType:      FavoriteProductTypeValue;
  initialIsFavorite: boolean;
  initialCount:     number;
  isLoggedIn:       boolean;
  /** Hiển thị số đếm kế bên icon (mặc định true) */
  showCount?:       boolean;
  /** Extra class cho wrapper button */
  className?:       string;
  /** Kích thước icon (mặc định 16) */
  iconSize?:        number;
}

interface ToggleResponse {
  data: { isFavorite: boolean; favoriteCount: number };
}

export default function FavoriteButton({
  productId,
  productType,
  initialIsFavorite,
  initialCount,
  isLoggedIn,
  showCount = true,
  className = "",
  iconSize = 16,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [count, setCount]           = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  // Lưu snapshot để rollback nếu API lỗi
  const snapshot = { isFavorite, count };

  function handleClick(e: React.MouseEvent) {
    // Ngăn event lan lên Link overlay (khi FavoriteButton nằm trong card có Link phủ toàn bộ)
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      // Toast sẽ được show; dùng native alert tạm để không cần thêm dependency
      // (project đã có Sonner/toast — dùng dispatchEvent để giao tiếp với toast provider)
      window.dispatchEvent(
        new CustomEvent("cqd:toast", {
          detail: { type: "info", message: "Vui lòng đăng nhập để thêm vào yêu thích." },
        }),
      );
      return;
    }

    // Optimistic update
    const next = !isFavorite;
    setIsFavorite(next);
    setCount((c) => next ? c + 1 : Math.max(0, c - 1));

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productType, productId }),
        });

        if (!res.ok) throw new Error("request_failed");

        const json = (await res.json()) as ToggleResponse;
        // Sync với giá trị thực từ server
        setIsFavorite(json.data.isFavorite);
        setCount(json.data.favoriteCount);
      } catch {
        // Rollback nếu API lỗi
        setIsFavorite(snapshot.isFavorite);
        setCount(snapshot.count);
        window.dispatchEvent(
          new CustomEvent("cqd:toast", {
            detail: { type: "error", message: "Có lỗi xảy ra, vui lòng thử lại." },
          }),
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={isFavorite}
      className={[
        "inline-flex items-center gap-1 transition-all duration-200",
        isPending ? "opacity-60 cursor-wait" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <Heart
        size={iconSize}
        strokeWidth={2}
        className={[
          "transition-all duration-200",
          isFavorite
            ? "fill-[#E53E3E] text-[#E53E3E] scale-110"
            : "fill-transparent text-[#94a3b8]",
        ].join(" ")}
      />
      {showCount && count > 0 && (
        <span
          className={[
            "text-xs font-medium leading-none transition-colors",
            isFavorite ? "text-[#E53E3E]" : "text-[#94a3b8]",
          ].join(" ")}
        >
          {count.toLocaleString("vi-VN")}
        </span>
      )}
    </button>
  );
}
