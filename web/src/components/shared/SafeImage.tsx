"use client";

import { useState } from "react";
import type { ImgHTMLAttributes } from "react";

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * URL to try when the primary src fails.
   * Tip: pass the original (un-proxied) URL so the browser can try it directly.
   */
  fallbackSrc?: string;
}

// Transparent 1×1 SVG — replaces the broken-image icon as last resort
const SVG_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

/**
 * Drop-in replacement for <img> with a two-stage error fallback:
 *   1. Try fallbackSrc (e.g. the original CDN/raw URL before proxy conversion)
 *   2. Show a transparent placeholder instead of the broken-image browser icon
 *
 * Usage with r2Url():
 *   <SafeImage
 *     src={r2Url(thumbnailUrl)}
 *     fallbackSrc={thumbnailUrl ?? undefined}
 *     alt="..."
 *     style={{ width: "100%", height: "100%", objectFit: "cover" }}
 *   />
 */
export function SafeImage({
  src,
  fallbackSrc,
  onError,
  alt = "",
  ...props
}: SafeImageProps) {
  const [current, setCurrent] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={current}
      onError={(e) => {
        onError?.(e);
        // Stage 1: try fallbackSrc (original URL before proxy)
        if (current === src && fallbackSrc && fallbackSrc !== src) {
          setCurrent(fallbackSrc);
          return;
        }
        // Stage 2: transparent placeholder (no broken-image icon)
        if (current !== SVG_PLACEHOLDER) {
          setCurrent(SVG_PLACEHOLDER);
        }
      }}
    />
  );
}
