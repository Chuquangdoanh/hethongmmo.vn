import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import DepositBankForm from "./_components/DepositBankForm";

export const metadata: Metadata = { title: "Admin — Cài đặt hệ thống" };

const DEFAULTS = {
  bank_name:      process.env.BANK_NAME           ?? "MB Bank",
  account_number: process.env.BANK_ACCOUNT_NUMBER ?? "0393118789",
  account_holder: process.env.BANK_ACCOUNT_HOLDER ?? "CHU QUANG DOANH",
  bank_bin:       process.env.BANK_BIN            ?? "MB",
  ip_whitelist:   (process.env.SEPAY_IP_WHITELIST ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  tax_percent:    8, // giá trị gợi ý pre-fill trong form; thuế chỉ thực sự bật sau khi admin bấm Lưu
};

export default async function CaiDatHeThongPage() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "deposit_bank_config" },
    select: { value: true },
  });

  const saved = (config?.value ?? {}) as Record<string, unknown>;

  const bankName      = (saved["bank_name"]      as string | undefined) ?? DEFAULTS.bank_name;
  const accountNumber = (saved["account_number"] as string | undefined) ?? DEFAULTS.account_number;
  const accountHolder = (saved["account_holder"] as string | undefined) ?? DEFAULTS.account_holder;
  const bankBin       = (saved["bank_bin"]       as string | undefined) ?? DEFAULTS.bank_bin;
  const ipWhitelist   = Array.isArray(saved["ip_whitelist"])
    ? (saved["ip_whitelist"] as string[]).filter(Boolean)
    : DEFAULTS.ip_whitelist;
  const taxPercent    = typeof saved["tax_percent"] === "number"
    ? (saved["tax_percent"] as number)
    : DEFAULTS.tax_percent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý cấu hình chung của hệ thống</p>
      </div>

      <DepositBankForm
        initialBankName={bankName}
        initialAccountNumber={accountNumber}
        initialAccountHolder={accountHolder}
        initialBankBin={bankBin}
        initialIpWhitelist={ipWhitelist}
        initialTaxPercent={taxPercent}
      />
    </div>
  );
}
