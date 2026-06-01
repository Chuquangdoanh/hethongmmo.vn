import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-24 text-center">
      <p className="text-8xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent leading-none mb-4">
        404
      </p>
      <h1 className="text-2xl font-bold text-[#F4F4F5] mb-3">Trang không tồn tại</h1>
      <p className="text-[#71717A] text-sm max-w-sm mb-8">
        Trang bạn đang tìm không tồn tại hoặc đã bị xóa. Kiểm tra lại đường dẫn hoặc quay về trang chủ.
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
          className="px-5 py-2.5 rounded-md border border-[#2A2A38] text-[#A1A1AA] text-sm hover:border-[#7C3AED] hover:text-[#F4F4F5] transition-colors"
        >
          Xem dịch vụ
        </Link>
      </div>
    </div>
  );
}
