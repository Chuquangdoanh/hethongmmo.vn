"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

interface Props {
  href?: string;
  className?: string;
}

export default function BackBtn({ href, className }: Props) {
  const router = useRouter();
  const cls = `back-btn${className ? ` ${className}` : ""}`;

  if (href) {
    return (
      <Link href={href} className={cls} aria-label="Quay lại" prefetch={false}>
        <FiArrowLeft size={16} />
      </Link>
    );
  }

  return (
    <button className={cls} onClick={() => router.back()} aria-label="Quay lại">
      <FiArrowLeft size={16} />
    </button>
  );
}
