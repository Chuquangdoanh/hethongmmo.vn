import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { getSellerConfig, DEFAULT_SLOT_PACKAGES } from "@/lib/services/seller.service";
import SellerSettingsForm from "./SellerSettingsForm";
import SellerTierManager from "./_components/SellerTierManager";
import type { SellerTierDefinition } from "@prisma/client";

export const metadata: Metadata = { title: "Admin — Cài đặt bán hàng" };

export default async function SellerSettingsPage() {
  const [config, tiers] = await Promise.all([
    getSellerConfig(),
    prisma.sellerTierDefinition.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  // Ưu tiên đọc từ STANDARD tier (nguồn thực tế của getSellerTierConfig)
  const standardTier = tiers.find((t) => t.key === "STANDARD");
  const feePercent   = standardTier?.feePercent        ?? config.withdrawal_fee_percent ?? 5;
  const minAmount    = standardTier?.minWithdrawal     ?? config.min_withdrawal_amount  ?? 200_000;
  const holdDays     = standardTier?.holdDays          ?? config.order_hold_days        ?? 3;
  const slotPackages     = config.slot_packages          ?? DEFAULT_SLOT_PACKAGES;
  const registrationFee  = config.registration_fee       ?? 50_000;

  return (
    <div className="space-y-6">
      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt bán hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình rút tiền, gói slot và hạng nhà bán hàng</p>
      </div>

      {/* ── 2 cột chính ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 items-start">

        {/* Cột trái: Cấu hình rút tiền + Gói slot + Flow */}
        <div className="space-y-5">
          <SellerSettingsForm
            initialFeePercent={feePercent}
            initialMinAmount={minAmount}
            initialHoldDays={holdDays}
            initialSlotPackages={slotPackages}
            initialRegistrationFee={registrationFee}
          />

          {/* Flow reference */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Flow rút tiền nhà bán hàng</h2>
            <div className="space-y-3 text-xs text-gray-600">
              {[
                {
                  step: "1", color: "bg-violet-100 text-violet-600",
                  title: "Seller gửi yêu cầu",
                  desc: "Chọn đơn hàng đủ điều kiện → hệ thống tính tổng, phí, thực nhận",
                },
                {
                  step: "2", color: "bg-amber-100 text-amber-600",
                  title: "Admin duyệt",
                  desc: "Duyệt → đơn hàng đánh dấu withdrawn=true. Từ chối → seller gửi lại được.",
                },
                {
                  step: "3", color: "bg-emerald-100 text-emerald-600",
                  title: "Admin chuyển khoản",
                  desc: "Chuyển khoản ngân hàng → bấm \"Xác nhận\" → COMPLETED, seller nhận thông báo.",
                },
              ].map(({ step, color, title, desc }) => (
                <div key={step} className="flex gap-3 items-start">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 text-xs ${color}`}>
                    {step}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-700 mb-0.5">{title}</p>
                    <p className="text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải: Hạng nhà bán hàng (sticky) */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <SellerTierManager
            initialTiers={tiers as (SellerTierDefinition & { benefits: string[] })[]}
          />
        </div>
      </div>
    </div>
  );
}
