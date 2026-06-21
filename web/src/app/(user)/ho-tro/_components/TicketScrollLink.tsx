"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "onClick"> & {
  isActive?: boolean;
};

export default function TicketScrollLink({ children, ...props }: Props) {
  return (
    <Link
      {...props}
      scroll={false}
      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
    >
      {children}
    </Link>
  );
}
