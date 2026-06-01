import Skeleton from "@/components/shared/Skeleton";

export default function GlobalLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 md:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
      {/* Page title skeleton */}
      <Skeleton.Base className="h-8 w-48 mb-6" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    </div>
  );
}
