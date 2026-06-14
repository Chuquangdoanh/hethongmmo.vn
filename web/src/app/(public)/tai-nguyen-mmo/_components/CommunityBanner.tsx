"use client";

import { useState, useEffect } from "react";
import { X, FileText, ShieldCheck, AlertTriangle, CheckCircle, ExternalLink, Zap, Headphones } from "lucide-react";

type ModalId = "rules" | "commitments" | "warnings";

const MODAL_CONFIG: Record<ModalId, { title: string; accent: string; Icon: typeof FileText }> = {
  rules:       { title: "Quy định hỗ trợ – Bảo hành – Khiếu nại", accent: "#3b82f6", Icon: FileText      },
  commitments: { title: "Cam kết của Hệ Thống MMO",                accent: "#3b82f6", Icon: ShieldCheck   },
  warnings:    { title: "Lưu ý quan trọng",                        accent: "#f59e0b", Icon: AlertTriangle },
};

function ModalContent({ id }: { id: ModalId }) {
  if (id === "rules") {
    return (
      <div className="space-y-4 text-sm text-[#374151]">
        <div className="flex items-start gap-2.5">
          <CheckCircle size={14} strokeWidth={2.5} className="text-[#3b82f6] mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            Hỗ trợ bảo hành và xử lý khiếu nại trong vòng{" "}
            <strong className="text-[#111827]">24 giờ</strong>{" "}
            kể từ thời điểm đơn hàng được bàn giao thành công.
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted font-semibold mb-2 pl-6">Các trường hợp được hỗ trợ:</p>
          {[
            "Sai mật khẩu từ trước.",
            "Sai thông tin đăng nhập.",
            "Mail lỗi hoặc không truy cập được.",
            "Link BM lỗi hoặc không đúng mô tả sản phẩm.",
            "Sản phẩm không đúng nội dung đã cam kết.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 pl-6 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 shrink-0" />
              <p className="text-[13px] leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2.5">
          <CheckCircle size={14} strokeWidth={2.5} className="text-[#3b82f6] mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            Đơn hàng khiếu nại hợp lệ sẽ được ưu tiên xử lý nhanh bởi Seller và đội ngũ hỗ trợ của{" "}
            <span className="text-warning font-semibold">Hệ Thống MMO</span>.
          </p>
        </div>
      </div>
    );
  }

  if (id === "commitments") {
    return (
      <div className="space-y-3">
        {[
          "Bảo vệ quyền lợi của người mua và nhà bán hàng.",
          "Hỗ trợ xử lý tranh chấp minh bạch, công bằng.",
          "Ưu tiên giải quyết nhanh các đơn hàng có khiếu nại hợp lệ.",
          "Xây dựng môi trường giao dịch MMO an toàn, uy tín và bền vững.",
          "Nói không với lừa đảo, gian lận và các hành vi gây ảnh hưởng đến cộng đồng.",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2.5">
            <CheckCircle size={14} strokeWidth={2.5} className="text-[#3b82f6] mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    );
  }

  /* warnings */
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {[
          "Chỉ tiếp nhận khiếu nại trong vòng 24 giờ kể từ thời điểm mua hàng.",
          "Sau 24 giờ, hệ thống mặc định đơn hàng đã được người mua kiểm tra, xác nhận và sử dụng ổn định.",
          "Hệ thống có quyền từ chối hỗ trợ đối với các trường hợp khiếu nại quá thời gian quy định nhằm bảo vệ quyền lợi chính đáng của nhà bán hàng.",
          "Người mua có trách nhiệm kiểm tra đầy đủ thông tin sản phẩm ngay sau khi nhận hàng.",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2.5">
            <AlertTriangle size={13} strokeWidth={2.5} className="text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[11px] text-text-muted font-semibold mb-2">Không chịu trách nhiệm với:</p>
        {[
          "Người mua tự thay đổi thông tin tài khoản.",
          "Chuyển giao, chia sẻ hoặc bán lại tài khoản cho bên thứ ba.",
          "Tài khoản bị khóa, checkpoint hoặc hạn chế do quá trình sử dụng của người mua.",
          "Các lỗi phát sinh sau thời gian bảo hành 24 giờ.",
          "Các trường hợp vi phạm chính sách nền tảng dẫn đến mất quyền truy cập tài khoản.",
          "Người mua không kiểm tra sản phẩm trong thời gian quy định.",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
            <p className="text-[13px] text-[#374151] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CommunityBannerData {
  communityTitle?: string;
  communityTelegramLabel?: string;
  communityTelegramUrl?: string;
  communitySupportLabel?: string;
  communitySupportText?: string;
  communityGroupLabel?: string;
  communityGroupDesc?: string;
  communityFanpageLabel?: string;
  communityFanpageUrl?: string;
}

export function CommunityBanner({ data = {} }: { data?: CommunityBannerData }) {
  const communityTitle    = data.communityTitle       ?? "CỘNG ĐỒNG MMO — HỆ THỐNG MMO 5.0";
  const telegramLabel     = data.communityTelegramLabel ?? "Nhóm Telegram – Cộng đồng Update Biến Chuyển Meta";
  const telegramUrl       = data.communityTelegramUrl ?? "https://t.me/hethongmmovn";
  const supportLabel      = data.communitySupportLabel ?? "Chăm sóc khách hàng";
  const supportText       = data.communitySupportText ?? "HỆ THỐNG MMO - Telegram : @hethongmmo.vn (Hỗ trợ 24/7 mọi ngày)";
  const groupLabel        = data.communityGroupLabel   ?? "Cộng Đồng MMO";
  const groupDesc         = data.communityGroupDesc    ?? "Nơi giao lưu, chia sẻ kiến thức, tài nguyên và cập nhật các xu hướng mới nhất về MMO, Facebook Ads, Marketing và kiếm tiền online.";
  const fanpageLabel      = data.communityFanpageLabel ?? "Kênh Fanpage Chính Thức";
  const fanpageUrl        = data.communityFanpageUrl  ?? "https://www.facebook.com/hethongmmo.vn/";

  const [open, setOpen] = useState<ModalId | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const cfg = open ? MODAL_CONFIG[open] : null;

  return (
    <>
      {/* ── BANNER ── */}
      <div className="bg-[#f1f5f9] border-b border-border">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">

          {/* Title */}
          {(() => {
            const [titleMain, titleHighlight] = communityTitle.split(" — ");
            return (
              <div className="flex items-center gap-3 mb-8">
                <span className="hidden md:block h-px flex-1 bg-[#e5e7eb]" />
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-wider text-center flex-1 md:flex-none" style={{ color: "#111827" }}>
                  {/* Mobile: 2 dòng riêng */}
                  <span className="block md:hidden">
                    {titleMain}
                  </span>
                  {titleHighlight && (
                    <span className="block md:hidden" style={{ color: "#f97316" }}>
                      {titleHighlight}
                    </span>
                  )}
                  {/* Desktop: 1 dòng inline */}
                  <span className="hidden md:inline">
                    {titleMain}
                    {titleHighlight && (
                      <> — <span style={{ color: "#f97316" }}>{titleHighlight}</span></>
                    )}
                  </span>
                </h2>
                <span className="hidden md:block h-px flex-1 bg-[#e5e7eb]" />
              </div>
            );
          })()}

          {/* Community channels — centered text layout */}
          <div className="max-w-xl mx-auto text-center space-y-4 mb-8">

            {/* Telegram group */}
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>
                🔹 {telegramLabel}
              </p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs hover:underline underline-offset-2"
                style={{ color: "#0066ff" }}
              >
                {telegramUrl} <ExternalLink size={10} strokeWidth={2} />
              </a>
            </div>

            {/* Support */}
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>🔹 {supportLabel}</p>
              <p className="text-sm" style={{ color: "#374151" }}>
                <span style={{ color: "#f97316", fontWeight: 700 }}>HỆ THỐNG MMO</span>
                {supportText.replace("HỆ THỐNG MMO", "")}
              </p>
            </div>

            {/* Community */}
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>🔹 {groupLabel}</p>
              <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>{groupDesc}</p>
            </div>

            {/* Fanpage */}
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#111827" }}>🔹 {fanpageLabel}</p>
              <a
                href={fanpageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs hover:underline underline-offset-2"
                style={{ color: "#1877F2" }}
              >
                {fanpageUrl} <ExternalLink size={10} strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Trust icons */}
          <div className="flex items-center justify-center gap-6 mb-6">
            {([
              { Icon: Zap,         color: "#f59e0b", text: "Giao hàng tự động" },
              { Icon: ShieldCheck, color: "#10b981", text: "Bảo mật 100%"      },
              { Icon: Headphones,  color: "#7c3aed", text: "Hỗ trợ 24/7"       },
            ] as const).map(({ Icon, color, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
                  <Icon size={16} strokeWidth={2} style={{ color }} />
                </div>
                <span className="text-xs font-semibold text-[#374151] leading-snug text-center">{text}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 max-w-xl mx-auto mb-6">
            <span className="h-px flex-1 bg-[#e5e7eb]" />
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">Chính sách & cam kết</span>
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          {/* 3 popup trigger buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setOpen("rules")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1d4ed8]/40 text-xs font-semibold text-[#1d4ed8] bg-[#1d4ed8]/10 hover:bg-[#1d4ed8]/20 hover:border-[#1d4ed8] transition-all"
            >
              <FileText size={13} strokeWidth={2} />
              Quy định hỗ trợ
            </button>
            <button
              onClick={() => setOpen("commitments")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-warning/40 text-xs font-semibold text-warning bg-warning/10 hover:bg-warning/20 hover:border-warning transition-all"
            >
              <ShieldCheck size={13} strokeWidth={2} />
              Cam kết của <span className="font-extrabold">Hệ Thống MMO</span>
            </button>
            <button
              onClick={() => setOpen("warnings")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#d1d5db] text-xs font-semibold text-[#374151] bg-[#f9fafb] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-all"
            >
              <AlertTriangle size={13} strokeWidth={2} />
              Lưu ý quan trọng
            </button>
          </div>

        </div>
      </div>

      {/* ── MODAL POPUP ── */}
      {open && cfg && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb] bg-[#f9fafb] rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${cfg.accent}20` }}
                >
                  <cfg.Icon size={15} strokeWidth={2} style={{ color: cfg.accent }} />
                </div>
                <h3 className="text-sm font-extrabold text-[#111827]">{cfg.title}</h3>
              </div>
              <button
                onClick={() => setOpen(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] hover:text-[#111827] transition-colors shrink-0"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-5 overflow-y-auto">
              <ModalContent id={open} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
