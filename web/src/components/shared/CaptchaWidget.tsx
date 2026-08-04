"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface CaptchaWidgetRef {
  reset: () => void;
}

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  // Gọi khi widget lỗi (Turnstile "error-callback") HOẶC script không tải được
  // (bị mạng di động/adblocker chặn) — giúp UI báo rõ thay vì im lặng treo.
  onError?: () => void;
  siteKey?: string;
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_LOAD_TIMEOUT_MS = 10_000;

const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(function CaptchaWidget(
  {
    onVerify,
    onExpire,
    onError,
    siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => { onVerifyRef.current = onVerify; });
  useEffect(() => { onExpireRef.current = onExpire; });
  useEffect(() => { onErrorRef.current = onError; });

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!siteKey) return;

    function cleanup() {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    }

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => onVerifyRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onErrorRef.current?.(),
      });
    }

    // Nếu script/widget không sẵn sàng sau SCRIPT_LOAD_TIMEOUT_MS (mạng di động
    // chặn challenges.cloudflare.com, hoặc script tải xong nhưng không init được)
    // → báo lỗi thay vì để nút đăng nhập/đăng ký treo im lặng vô thời hạn.
    const loadTimeout = setTimeout(() => {
      if (widgetIdRef.current === null) onErrorRef.current?.();
    }, SCRIPT_LOAD_TIMEOUT_MS);

    if (window.turnstile) {
      renderWidget();
      clearTimeout(loadTimeout);
      return cleanup;
    }

    if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => { renderWidget(); clearTimeout(loadTimeout); };
      script.onerror = () => onErrorRef.current?.();
      document.head.appendChild(script);
    } else {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          clearTimeout(loadTimeout);
          renderWidget();
        }
      }, 100);
      return () => { clearInterval(t); clearTimeout(loadTimeout); cleanup(); };
    }

    return () => { clearTimeout(loadTimeout); cleanup(); };
  }, [siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="mt-2" />;
});

export default CaptchaWidget;
