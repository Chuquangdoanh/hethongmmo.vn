import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin — Cài đặt giao diện" };

const PAGES = [
  {
    href: "/admin/cai-dat-giao-dien/trang-chu",
    title: "Trang chủ",
    desc: "Hero, DJ Media Intro, Đội ngũ, Thống kê, Báo chí, FAQ",
    icon: "🏠",
  },
  {
    href: "/admin/cai-dat-giao-dien/dich-vu",
    title: "Dịch vụ",
    desc: "Tiêu đề, mô tả trang /dich-vu",
    icon: "⚙️",
  },
  {
    href: "/admin/cai-dat-giao-dien/khoa-hoc",
    title: "Khóa học",
    desc: "Tiêu đề, badge, mô tả trang /khoa-hoc",
    icon: "🎓",
  },
  {
    href: "/admin/cai-dat-giao-dien/quang-cao",
    title: "Quảng cáo",
    desc: "Tiêu đề, mô tả trang /quang-cao",
    icon: "📢",
  },
  {
    href: "/admin/cai-dat-giao-dien/tut-tricks",
    title: "TUT & Tricks",
    desc: "Tiêu đề, mô tả trang /tut-tricks",
    icon: "📖",
  },
  {
    href: "/admin/cai-dat-giao-dien/tai-nguyen",
    title: "Tài nguyên MMO",
    desc: "Tiêu đề, mô tả trang /tai-nguyen-mmo",
    icon: "💎",
  },
  {
    href: "/admin/cai-dat-giao-dien/networks",
    title: "Networks",
    desc: "Tiêu đề, mô tả trang /NetWorks",
    icon: "🌐",
  },
  {
    href: "/admin/cai-dat-giao-dien/footer",
    title: "Footer",
    desc: "CTA banner, thương hiệu, liên kết, liên hệ, bản quyền",
    icon: "🦶",
  },
  {
    href: "/admin/cai-dat-giao-dien/trang-cam-on",
    title: "Trang Cảm Ơn",
    desc: "Tiêu đề, thông điệp, nút hành động, kênh hỗ trợ trang /cam-on",
    icon: "🙏",
  },
];

export default function CaiDatGiaoDienPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt giao diện</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý nội dung hiển thị trên các trang public</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="text-3xl">{p.icon}</span>
            <div>
              <p className="font-bold text-gray-900">{p.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
