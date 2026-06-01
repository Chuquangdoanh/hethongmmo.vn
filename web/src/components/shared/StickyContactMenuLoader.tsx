"use client";

import dynamic from "next/dynamic";

const StickyContactMenu = dynamic(
  () => import("@/components/shared/StickyContactMenu"),
  { ssr: false }
);

export default function StickyContactMenuLoader() {
  return <StickyContactMenu />;
}
