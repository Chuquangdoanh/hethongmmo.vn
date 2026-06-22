import Image from "next/image";
import Skeleton from "@/components/shared/Skeleton";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 md:px-6 lg:px-8 py-8">
      <div className="w-full max-w-7xl">

        {/* Header loading */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">

          {/* ICON / IMAGE */}
          <div className="mb-4 relative flex h-16 w-16 items-center justify-center">

            <Image
              src="/images/logo.png"   // 👉 đổi ảnh tại đây
              alt="loading"
              width={56}
              height={56}
              className="
                h-14 w-14
                rounded-2xl
                border-2 border-blue-500
                shadow-lg
                ring-4 ring-blue-200/40
                animate-pulse
                object-cover
              "
            />

          </div>

          {/* Text */}
          <h2 className="text-lg md:text-xl font-bold text-slate-800">
            Đang tải dữ liệu...
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Vui lòng chờ trong giây lát
          </p>

          {/* Progress bar */}
          <div className="mt-5 w-full max-w-sm">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="loading-bar h-full rounded-full bg-blue-500" />
            </div>
          </div>

        </div>

      </div>

    

    </div>
  );
}