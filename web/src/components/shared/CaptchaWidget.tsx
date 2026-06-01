"use client";

import { useEffect, useRef } from "react";

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
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  siteKey?: string;
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

export default function CaptchaWidget({
  onVerify,
  onExpire,
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
}: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callback refs in sync so the widget always calls the latest version
  // without needing to re-render the widget when callbacks change
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onVerifyRef.current = onVerify; });
  useEffect(() => { onExpireRef.current = onExpire; });

  useEffect(() => {
    if (!siteKey) return;

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return;
      // Guard: do not call render() again if already rendered
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token: string) => onVerifyRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(t);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]); // chỉ re-render widget khi siteKey thay đổi

  if (!siteKey) return null;

  return <div ref={containerRef} className="mt-2" />;
}
