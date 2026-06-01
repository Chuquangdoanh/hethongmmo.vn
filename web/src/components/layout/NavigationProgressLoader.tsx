"use client";

import dynamic from "next/dynamic";

const NavigationProgress = dynamic(
  () => import("./NavigationProgress"),
  { ssr: false },
);

export default function NavigationProgressLoader() {
  return <NavigationProgress />;
}
