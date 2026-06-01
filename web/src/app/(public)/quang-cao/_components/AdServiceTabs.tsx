"use client";

import { useState } from "react";
import { Target, KeyRound, BarChart3, TrendingUp, Music2, Flame, Users } from "lucide-react";

const FB_SERVICES = [
  {
    Icon: Target,
    title: "Chạy Quảng Cáo Facebook",
    desc: "Setup chiến dịch bán hàng cám kết đơn hàng. Tối ưu chuyển đổi, tìm khách hàng mới cho sản phẩm của bạn.",
  },
  {
    Icon: KeyRound,
    title: "Cho Thuê Tài Khoản Quảng Cáo",
    desc: "Tài khoản chuyên độ tiên nhận, đang. Scale ads bền vững với tài khoản agency chính hãng.",
  },
  {
    Icon: BarChart3,
    title: "Cung Cấp Tài Nguyên Ads",
    desc: "Tài Khoản Quảng Cáo VIP Siêu Trâu · BM Xác Minh Doanh Nghiệp · BM 5, BM 10 · Fanpage Co Tick xanh.",
  },
  {
    Icon: TrendingUp,
    title: "Tối Ưu Chi Phí Quảng Cáo",
    desc: "Phù hợp chạy đủ ngân sách nhỏ. Giảm thiểu phí, tăng ROI tối đa cho mọi chiến dịch.",
  },
];

const TT_SERVICES = [
  {
    Icon: Music2,
    title: "Chạy Quảng Cáo TikTok",
    desc: "Tối ưu chiến dịch TikTok Ads, tiếp cận Gen Z và người dùng trẻ, tăng nhận diện thương hiệu.",
  },
  {
    Icon: Flame,
    title: "TikTok Spark Ads",
    desc: "Boost video TikTok hữu cơ thành quảng cáo, tăng tương tác tự nhiên và hiệu quả chuyển đổi.",
  },
  {
    Icon: Users,
    title: "TikTok Creator & Affiliate",
    desc: "Kết nối với creator, triển khai affiliate marketing trên TikTok Shop hiệu quả.",
  },
  {
    Icon: BarChart3,
    title: "Tối Ưu TikTok ROI",
    desc: "Phân tích dữ liệu, tối ưu chiến dịch theo từng giai đoạn, đảm bảo ROI tối đa.",
  },
];

export default function AdServiceTabs() {
  const [tab, setTab] = useState<"facebook" | "tiktok">("facebook");
  const services = tab === "facebook" ? FB_SERVICES : TT_SERVICES;

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setTab("facebook")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all ${
            tab === "facebook"
              ? "bg-[#f59e0b] border-[#f59e0b] text-white shadow-md"
              : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#f59e0b] hover:text-[#f59e0b]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icon tiktok.png" alt="" className="w-4 h-4 hidden" aria-hidden />
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: tab === "facebook" ? "white" : "#1877f2" }}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook Ads
        </button>
        <button
          onClick={() => setTab("tiktok")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all ${
            tab === "tiktok"
              ? "bg-[#0f172a] border-[#0f172a] text-white shadow-md"
              : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#0f172a] hover:text-[#0f172a]"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
          TikTok Ads
        </button>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {services.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl border border-[#e2e8f0] bg-white p-6 hover:border-[#0066ff] hover:shadow-sm transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0066ff]/08 flex items-center justify-center mb-4" style={{ background: "rgba(0,102,255,0.08)" }}>
              <Icon size={22} strokeWidth={1.75} className="text-[#0066ff]" />
            </div>
            <h3 className="text-sm font-bold text-[#0f172a] mb-2">{title}</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
