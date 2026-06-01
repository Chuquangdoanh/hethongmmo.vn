interface SkeletonBaseProps {
  className?: string;
}

function Base({ className = "" }: SkeletonBaseProps) {
  return (
    <div
      className={`skeleton-pulse rounded-lg bg-[#1F1F2E] ${className}`}
    />
  );
}

function Card() {
  return (
    <div className="rounded-xl border border-[#2A2A38] bg-[#14141F] overflow-hidden">
      <Base className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Base className="h-4 w-3/4" />
        <Base className="h-3 w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <Base className="h-5 w-24" />
          <Base className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function Table({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[#2A2A38] overflow-hidden">
      <div className="bg-[#14141F] border-b border-[#2A2A38] px-4 py-3 flex gap-4">
        {[40, 25, 20, 15].map((w, i) => (
          <Base key={i} className={`h-4 w-${w}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b border-[#2A2A38] last:border-0">
          <Base className="h-4 w-40" />
          <Base className="h-4 w-24" />
          <Base className="h-4 w-20" />
          <Base className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function Text({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-5/6", "w-4/5", "w-3/4", "w-2/3"];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Base key={i} className={`h-4 ${widths[i % widths.length] ?? "w-full"}`} />
      ))}
    </div>
  );
}

const Skeleton = { Card, Table, Text, Base };
export default Skeleton;
