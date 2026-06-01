"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0]!;
}

export default function DateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status");
  const orderType = searchParams.get("orderType");

  function navigate(from: string | null, to: string | null) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (orderType) sp.set("orderType", orderType);
    if (from) sp.set("dateFrom", from);
    if (to) sp.set("dateTo", to);
    const q = sp.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const today = getDateStr(0);
  const isAll = dateFrom === "all";
  const isToday = !isAll && (!dateFrom || dateFrom === today) && (!dateTo || dateTo === today);
  const is7 = !isAll && dateFrom === getDateStr(6) && (!dateTo || dateTo === today);
  const is30 = !isAll && dateFrom === getDateStr(29) && (!dateTo || dateTo === today);

  const presets = [
    { label: "Hôm nay", active: isToday, onClick: () => navigate(today, today) },
    { label: "7 ngày",  active: is7,     onClick: () => navigate(getDateStr(6), today) },
    { label: "30 ngày", active: is30,    onClick: () => navigate(getDateStr(29), today) },
    { label: "Tất cả",  active: isAll,   onClick: () => navigate("all", null) },
  ];

  const inputFrom = isAll ? "" : (dateFrom ?? today);
  const inputTo   = isAll ? "" : (dateTo   ?? today);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 font-medium">Ngày:</span>

      {presets.map(({ label, active, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            active
              ? "bg-[#7C3AED] text-white"
              : "bg-white border border-gray-200 text-gray-500 hover:border-[#7C3AED] hover:text-[#7C3AED]"
          }`}
        >
          {label}
        </button>
      ))}

      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          value={inputFrom}
          onChange={(e) => navigate(e.target.value || null, isAll ? null : inputTo || null)}
          className="border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
        />
        <span className="text-xs text-gray-400">—</span>
        <input
          type="date"
          value={inputTo}
          onChange={(e) => navigate(isAll ? null : inputFrom || null, e.target.value || null)}
          className="border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
        />
      </div>
    </div>
  );
}
