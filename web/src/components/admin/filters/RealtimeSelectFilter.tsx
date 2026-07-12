"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";

export interface SelectFilterOption {
  value: string;
  label: string;
}

interface Props {
  basePath: string;
  paramKey: string;
  label: string;
  icon: ReactNode;
  placeholder: string;
  options: SelectFilterOption[];
  className?: string;
}

export default function RealtimeSelectFilter({
  basePath, paramKey, label, icon, placeholder, options, className = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selected = searchParams.get(paramKey) ?? "";

  function handleChange(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page");
    if (value) sp.set(paramKey, value);
    else sp.delete(paramKey);
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 bg-white rounded-xl border border-gray-200 px-3.5 py-2.5 transition-opacity ${
        isPending ? "opacity-60 pointer-events-none" : ""
      } ${className}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 shrink-0">
        {icon}
        {label}
      </span>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 px-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 hover:border-blue-400 transition-colors cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
