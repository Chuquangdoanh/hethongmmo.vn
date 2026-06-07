import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Tìm hiểu về hethongmmo.vn — nền tảng MMO dịch vụ số #1 Việt Nam.",
};

const VALUES = [
  {
    icon: "🛡️",
    title: "An toàn & Đáng tin",
    desc: "Mọi giao dịch đều được bảo mật và ghi lại minh bạch. Hệ thống escrow bảo vệ quyền lợi người mua.",
  },
  {
    icon: "⚡",
    title: "Xử lý tức thì 24/7",
    desc: "Hệ thống tự động hoạt động liên tục — đặt hàng lúc nào cũng được, giao hàng ngay lập tức.",
  },
  {
    icon: "💰",
    title: "Giá cả cạnh tranh",
    desc: "Cam kết giá thấp nhất thị trường, hoàn tiền nếu không đáp ứng được yêu cầu.",
  },
  {
    icon: "🤝",
    title: "Hỗ trợ tận tâm",
    desc: "Đội ngũ hỗ trợ trực tiếp qua Telegram, Zalo, Facebook — phản hồi trong vòng 30 phút.",
  },
];

const TEAM = [
  { name: "Chu Quang Doanh", role: "Founder & CEO", avatar: "👨‍💼" },
];

export default async function GioiThieuPage() {
  await guardPublicPage("gioi-thieu");
  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-4">
          Về{" "}
          <span className="text-[#0066ff]">
            hethongmmo.vn
          </span>
        </h1>
        <p className="text-[#64748b] text-base leading-relaxed max-w-2xl mx-auto">
          Chúng tôi là nền tảng cung cấp dịch vụ MMO toàn diện tại Việt Nam — từ dịch vụ tăng tương tác mạng xã hội,
          khóa học, tài liệu tut/tricks cho đến marketplace tài nguyên số an toàn.
        </p>
      </div>

      {/* Mission */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-12 text-center">
        <p className="text-xs text-[#0066ff] font-semibold uppercase tracking-wider mb-3">Sứ mệnh</p>
        <blockquote className="text-xl font-semibold text-[#0f172a] leading-relaxed">
          &ldquo;Làm cho việc kiếm tiền online trở nên dễ dàng, minh bạch và đáng tin cậy cho mọi người Việt Nam.&rdquo;
        </blockquote>
      </div>

      {/* Values */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-[#0f172a] mb-8 text-center">Giá trị cốt lõi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALUES.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-[#e2e8f0] bg-white p-6">
              <p className="text-3xl mb-3">{icon}</p>
              <h3 className="text-sm font-semibold text-[#0f172a] mb-2">{title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: "2020", label: "Năm thành lập" },
          { value: "50K+", label: "Khách hàng" },
          { value: "1M+", label: "Đơn hoàn thành" },
          { value: "99.9%", label: "Tỷ lệ thành công" },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-xl border border-[#e2e8f0] bg-white p-5 text-center">
            <p className="text-2xl font-bold text-[#0066ff] mb-1">
              {value}
            </p>
            <p className="text-[11px] text-[#64748b]">{label}</p>
          </div>
        ))}
      </div>

      {/* Team */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-[#0f172a] mb-8 text-center">Đội ngũ</h2>
        <div className="flex justify-center gap-6">
          {TEAM.map(({ name, role, avatar }) => (
            <div key={name} className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#0066ff] flex items-center justify-center text-3xl mx-auto mb-3">
                {avatar}
              </div>
              <p className="text-sm font-semibold text-[#0f172a]">{name}</p>
              <p className="text-xs text-[#64748b]">{role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center rounded-2xl border border-[#e2e8f0] bg-white p-8">
        <h2 className="text-lg font-bold text-[#0f172a] mb-3">Sẵn sàng bắt đầu?</h2>
        <p className="text-sm text-[#64748b] mb-6">
          Đăng ký miễn phí và khám phá hàng trăm dịch vụ ngay hôm nay.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dang-ky"
            className="px-6 py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-medium hover:bg-[#0047cc] transition-colors"
          >
            Đăng ký ngay
          </Link>
          <Link
            href="/lien-he"
            className="px-6 py-2.5 rounded-lg border border-[#e2e8f0] text-[#64748b] text-sm hover:border-[#0066ff] hover:text-[#0f172a] transition-colors"
          >
            Liên hệ chúng tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
