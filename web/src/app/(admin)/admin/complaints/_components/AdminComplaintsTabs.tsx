import Link from "next/link";

export type ComplaintsAdminTab = "complaints" | "presale" | "support" | "violations";

const TABS: { key: ComplaintsAdminTab; label: string }[] = [
  { key: "complaints", label: "Khiếu nại" },
  { key: "presale", label: "Tin nhắn trước khi mua" },
  { key: "support", label: "Hỗ trợ sau khi mua" },
  { key: "violations", label: "Vi phạm chat" },
];

export default function AdminComplaintsTabs({ active }: { active: ComplaintsAdminTab }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const href = tab.key === "complaints" ? "/admin/complaints" : `/admin/complaints?tab=${tab.key}`;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-[#7C3AED] text-[#7C3AED]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
