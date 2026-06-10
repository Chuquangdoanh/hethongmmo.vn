"use client";

import { useState } from "react";
import { Star, Users, Calendar, Clock, ShieldCheck } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";
import { r2Url } from "@/lib/utils/image-url";
import TutTrickBuyButton, { type TutTrickItem } from "@/components/shared/TutTrickBuyButton";

interface TutTrickCardItem {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  platform: string;
  category: string;
  tier: string;
  price: number;
  successRate: number;
  rating: number;
  totalOrders: number;
  isFeatured: boolean;
  publishedDate: string | null;
  description: string | null;
  warrantyPolicy: string | null;
  processingTime: string | null;
  catIcon: string | null;
}

interface Props {
  item: TutTrickCardItem;
  isLoggedIn: boolean;
  discountPct?: number;
}

export default function TutTrickCard({ item, isLoggedIn, discountPct = 0 }: Props) {
  const [showImage, setShowImage] = useState(false);

  const price = item.price;
  const publishedDateStr = item.publishedDate
    ? new Date(item.publishedDate).toLocaleDateString("vi-VN")
    : null;

  const buyItem: TutTrickItem = {
    id: item.id,
    name: item.name,
    thumbnail: item.thumbnail,
    platform: item.platform,
    category: item.category,
    price,
    description: item.description,
    successRate: item.successRate,
    rating: item.rating,
    totalOrders: item.totalOrders,
    publishedDate: publishedDateStr,
    warrantyPolicy: item.warrantyPolicy,
    processingTime: item.processingTime,
  };

  return (
    <article className="relative flex flex-col rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-[#0066ff]/40 transition-all duration-200 group">
      {item.isFeatured && (
        <span className="absolute top-0 right-0 px-3 py-1 text-[10px] font-extrabold bg-[#ef4444] text-white uppercase tracking-wider rounded-bl-xl rounded-tr-2xl z-10">
          HOT
        </span>
      )}

      {/* ── CHẾ ĐỘ XEM ẢNH: ẩn toàn bộ thông tin, chỉ hiện ảnh ── */}
      {showImage && item.thumbnail ? (
        <div className="flex flex-col flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r2Url(item.thumbnail)}
            alt={item.name}
            className="w-full flex-1 object-cover"
            style={{ minHeight: "220px" }}
          />
          <button
            type="button"
            onClick={() => setShowImage(false)}
            className="w-full py-2.5 text-xs font-bold text-[#475569] bg-[#f8fafc] border-t border-[#e2e8f0] hover:text-[#0066ff] transition-colors"
          >
            ← Quay lại thông tin
          </button>
        </div>
      ) : (
        /* ── CHẾ ĐỘ THÔNG THƯỜNG ── */
        <div className="flex flex-col flex-1 p-3 gap-5">

          {/* Row 1: Tên + ⭐ */}
          <div className="flex items-start justify-between gap-2 pr-12">
            <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug flex-1">
              {item.name}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#0f172a] text-white shrink-0">
              <Star size={10} fill="currentColor" className="text-[#fbbf24]" /> {item.rating.toFixed(1)}
            </span>
          </div>

          {/* Row 2: Danh mục + Xem ảnh */}
          <div className="flex items-center gap-1.5 flex-wrap -mt-3">
            {item.category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                {item.catIcon && (
                  <span className="flex items-center justify-center w-3.5 h-3.5 bg-white rounded border border-gray-200 p-0.5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r2Url(item.catIcon)} alt={item.category} width={12} height={12} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                  </span>
                )}
                {item.category}
              </span>
            )}
            {item.thumbnail && (
              <button
                type="button"
                onClick={() => setShowImage(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-[#e2e8f0] text-[#475569] hover:border-[#0066ff] hover:text-[#0066ff] transition-colors"
              >
                🖼 Xem ảnh
              </button>
            )}
          </div>

          {/* Row 3: Khách hàng + Ngày */}
          <div className="flex items-center gap-3 text-[11px] text-[#64748b] flex-wrap -mt-3">
            <span className="flex items-center gap-1">
              <Users size={12} className="text-[#94a3b8] shrink-0" />
              <span className="font-semibold text-[#0f172a]">{item.totalOrders.toLocaleString("vi-VN")}</span> khách hàng
            </span>
            {publishedDateStr && (
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-[#94a3b8] shrink-0" /> {publishedDateStr}
              </span>
            )}
          </div>

          {/* Card nhỏ: Xử lý + Bảo hành + Tỉ lệ */}
          {(item.warrantyPolicy ?? item.processingTime ?? item.successRate) && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2 text-[11px] -mt-3">
              {item.processingTime && (
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <Clock size={12} className="text-[#7C3AED] shrink-0" />
                  <span className="text-[#7C3AED] font-medium">Thời gian xử lý</span>
                  <span>{item.processingTime}</span>
                </span>
              )}
              {item.warrantyPolicy && (
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <ShieldCheck size={12} className="text-[#059669] shrink-0" />
                  <span className="text-[#059669] font-medium">Bảo hành</span>
                  <span>{item.warrantyPolicy}</span>
                </span>
              )}
              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#64748b]">Tỉ lệ thành công</span>
                  <span className="font-bold text-[#059669]">{item.successRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]"
                    style={{ width: `${item.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Giá + Nút mua */}
          <div className="flex items-stretch gap-2">
            <div className="flex-[2] flex flex-col items-center justify-center rounded-xl border-2 border-[#e11d48] px-2 py-2 gap-0.5">
              {discountPct > 0 && price > 0 && (
                <p className="text-[10px] text-[#94a3b8] line-through leading-tight">{formatVnd(price)}</p>
              )}
              <p className={`text-sm font-extrabold text-center leading-tight ${price === 0 ? "text-[#059669]" : "text-[#e11d48]"}`}>
                {price === 0 ? "Miễn phí" : formatVnd(discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price)}
              </p>
              {discountPct > 0 && price > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">-{discountPct}%</span>
              )}
            </div>
            <div className="flex-[3]">
              <TutTrickBuyButton
                item={buyItem}
                isLoggedIn={isLoggedIn}
                variant="solid-red"
                discountPct={discountPct}
              />
            </div>
          </div>

        </div>
      )}
    </article>
  );
}
