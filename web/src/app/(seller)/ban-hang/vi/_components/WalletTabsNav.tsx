import Link from "next/link";

const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "escrow",   label: "Ký quỹ" },
  { key: "withdraw", label: "Rút tiền" },
  { key: "history",  label: "Lịch sử" },
];

export default function WalletTabsNav({ active }: { active: string }) {
  return (
    <div className="flex gap-0.5 mb-6 border-b border-gray-200">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/ban-hang/vi?tab=${key}`}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === key
              ? "text-violet-700 border-violet-600"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
