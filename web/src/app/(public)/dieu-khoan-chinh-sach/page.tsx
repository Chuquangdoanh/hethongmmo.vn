import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import {
  ScrollText, FileText, ShieldCheck, Database, CreditCard, Store,
  UserCheck, Trash2, Copyright, Scale, MessageSquareWarning, ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { buildMeta } from "@/lib/utils/seo";

export const metadata: Metadata = buildMeta({
  title: "Điều Khoản & Chính Sách | hethongmmo.vn",
  description: "Tổng hợp toàn bộ điều khoản, chính sách và quy trình pháp lý của nền tảng MMO Marketplace hethongmmo.vn.",
  url: "/dieu-khoan-chinh-sach",
  image: "/images/hethong.png",
});

type DocLink = { href: string; label: string; desc: string; icon: React.ReactNode };
type DocGroup = { key: string; title: string; docs: DocLink[] };

const ICON = { size: 18, strokeWidth: 1.75, style: { color: "#0066ff" } } as const;

const GROUPS: DocGroup[] = [
  {
    key: "chung",
    title: "Điều khoản chung",
    docs: [
      { href: "/dieu-khoan",            label: "Điều khoản dịch vụ",        desc: "Quy định chung khi sử dụng nền tảng.", icon: <FileText {...ICON} /> },
      { href: "/dieu-khoan-nguoi-mua",  label: "Điều khoản dành cho Người mua", desc: "Quyền và trách nhiệm của người mua.", icon: <ShoppingBag {...ICON} /> },
      { href: "/quy-che-hoat-dong-san", label: "Quy chế hoạt động sàn",     desc: "Nguyên tắc vận hành sàn giao dịch.", icon: <ScrollText {...ICON} /> },
    ],
  },
  {
    key: "du-lieu",
    title: "Bảo mật & Dữ liệu",
    docs: [
      { href: "/chinh-sach",                        label: "Chính sách bảo mật",             desc: "Quyền riêng tư và bảo vệ thông tin.", icon: <ShieldCheck {...ICON} /> },
      { href: "/chinh-sach-xu-ly-du-lieu-ca-nhan",  label: "Chính sách xử lý dữ liệu cá nhân", desc: "Theo Nghị định 13/2023/NĐ-CP.", icon: <Database {...ICON} /> },
    ],
  },
  {
    key: "thanh-toan",
    title: "Thanh toán & Tranh chấp",
    docs: [
      { href: "/chinh-sach-thanh-toan",            label: "Chính sách thanh toán",           desc: "Nạp tiền, thanh toán, phí, rút tiền.", icon: <CreditCard {...ICON} /> },
      { href: "/chinh-sach-giai-quyet-tranh-chap", label: "Chính sách giải quyết tranh chấp", desc: "Thương lượng, hòa giải, trọng tài.", icon: <Scale {...ICON} /> },
      { href: "/chinh-sach-xu-ly-khieu-nai",       label: "Chính sách xử lý khiếu nại",      desc: "Kênh tiếp nhận và quy trình xử lý.", icon: <MessageSquareWarning {...ICON} /> },
    ],
  },
  {
    key: "nha-ban",
    title: "Nhà bán hàng",
    docs: [
      { href: "/chinh-sach-nha-ban-hang",     label: "Chính sách nhà bán hàng", desc: "Quy định, quyền lợi và trách nhiệm.", icon: <Store {...ICON} /> },
      { href: "/quy-trinh-kiem-duyet-seller", label: "Quy trình kiểm duyệt Seller", desc: "Đăng ký và phê duyệt nhà bán.", icon: <UserCheck {...ICON} /> },
      { href: "/quy-trinh-go-san-pham",       label: "Quy trình gỡ sản phẩm",   desc: "Căn cứ và trình tự gỡ sản phẩm vi phạm.", icon: <Trash2 {...ICON} /> },
      { href: "/chinh-sach-so-huu-tri-tue",   label: "Chính sách sở hữu trí tuệ", desc: "Bảo vệ bản quyền và xử lý vi phạm.", icon: <Copyright {...ICON} /> },
    ],
  },
];

export default async function DieuKhoanChinhSachPage() {
  await guardPublicPage("dieu-khoan-chinh-sach");
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">Điều khoản & Chính sách</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center shrink-0">
              <ScrollText size={28} strokeWidth={1.5} style={{ color: "#0066ff" }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">Điều Khoản & Chính Sách</h1>
              <p className="text-sm text-[#64748b] leading-relaxed">
                Tổng hợp toàn bộ điều khoản, chính sách và quy trình pháp lý của nền tảng. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Groups ── */}
      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section key={group.key}>
            <h2 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#0066ff] inline-block" />
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.docs.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="group flex items-start gap-4 rounded-xl border border-[#e2e8f0] bg-white p-4 hover:border-[#bfdbfe] hover:bg-[#f8fafc] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center shrink-0">
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a] group-hover:text-[#0066ff] transition-colors leading-snug">
                      {doc.label}
                    </p>
                    <p className="text-xs text-[#64748b] leading-snug mt-0.5">{doc.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#cbd5e1] group-hover:text-[#0066ff] transition-colors shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
