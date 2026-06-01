import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1F1F2E] border border-[#2A2A38]">
        <Icon size={28} className="text-[#71717A]" />
      </div>
      <h3 className="text-base font-semibold text-[#F4F4F5] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#A1A1AA] max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
