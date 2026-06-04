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

  const feePercent       = config.withdrawal_fee_percent ?? 5;
  const minAmount        = config.min_withdrawal_amount  ?? 200_000;
  const holdDays         = config.order_hold_days        ?? 3;
  const slotPackages     = config.slot_packages          ?? DEFAULT_SLOT_PACKAGES;
  const registrationFee  = config.registration_fee       ?? 50_000;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt bán hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình rút tiền, gói slot và hạng nhà bán hàng</p>
      </div>

      {/* ── Tier manager ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <SellerTierManager
          initialTiers={tiers as (SellerTierDefinition & { benefits: string[] })[]}
        />
      </div>

      {/* ── General settings ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5">Cài đặt chung</h2>
        <SellerSettingsForm
          initialFeePercent={feePercent}
          initialMinAmount={minAmount}
          initialHoldDays={holdDays}
          initialSlotPackages={slotPackages}
          initialRegistrationFee={registrationFee}
        />
      </div>

      {/* ── Flow reference ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Flow rút tiền nhà bán hàng</h2>
        <div className="space-y-3 text-xs text-gray-600">
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold shrink-0">1</span>
            <div>
              <p className="font-medium text-gray-700">Seller gửi yêu cầu</p>
              <p className="text-gray-400">Chọn đơn hàng đủ điều kiện → hệ thống tính tổng, phí, thực nhận</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">2</span>
            <div>
              <p className="font-medium text-gray-700">Admin duyệt</p>
              <p className="text-gray-400">Duyệt → đơn hàng đánh dấu withdrawn=true. Từ chối → seller gửi lại được.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">3</span>
            <div>
              <p className="font-medium text-gray-700">Admin chuyển khoản</p>
              <p className="text-gray-400">Chuyển khoản ngân hàng → bấm &quot;Xác nhận&quot; → COMPLETED, seller nhận thông báo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
