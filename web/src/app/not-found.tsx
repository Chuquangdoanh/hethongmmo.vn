
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-center px-4 py-24 text-center overflow-hidden">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      </div>

      <div className="relative mb-8">
        <div className="absolute -inset-6 rounded-full border border-[#7C3AED]/10" />
        <div className="absolute -inset-12 rounded-full border border-[#7C3AED]/5" />

        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[#7C3AED]/20 bg-white shadow-lg">
          <img
            src="/images/logo.png"
            alt="Maintenance"
            className="h-20 w-20 object-contain"
          />
        </div>
      </div>

      <div className="mb-4 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2 text-xs font-semibold text-[#7C3AED]">
        HỆ THỐNG
      </div>

      <h1 className="mb-3 text-4xl md:text-5xl font-bold text-[#18181B]">
        ĐANG NÂNG CẤP
      </h1>

      <p className="text-[#71717A] text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Chúng tôi đang hoàn thiện và nâng cấp hệ thống nhằm mang đến trải nghiệm
        ổn định và chuyên nghiệp hơn.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-md bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] transition-colors"
        >
          Về trang chủ
        </Link>

        <Link
          href="/dich-vu"
          className="px-5 py-2.5 rounded-md border border-[#2A2A38] text-[#71717A] text-sm hover:border-[#7C3AED] hover:text-[#18181B] transition-colors"
        >
          Xem dịch vụ
        </Link>
      </div>
    </div>
  );
}

