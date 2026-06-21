"use client";

import { useLayoutEffect } from "react";

export default function ScrollToTop() {
  // useLayoutEffect chạy đồng bộ trước khi browser paint —
  // đảm bảo scroll = 0 trước khi user thấy bất kỳ nội dung nào.
  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);
  return null;
}
