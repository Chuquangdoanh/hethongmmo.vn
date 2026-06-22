import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import DepositBankForm from "./_components/DepositBankForm";

export const metadata: Metadata = { title: "Admin — Cài đặt hệ thống" };

const DEFAULTS = {
  bank_name:      process.env.BANK_NAME           ?? "MB Bank",
  account_number: process.env.BANK_ACCOUNT_NUMBER ?? "0393118789",
  account_holder: process.env.BANK_ACCOUNT_HOLDER ?? "CHU QUANG DOANH",
  bank_bin:       process.env.BANK_BIN            ?? "MB",
};

export default async function CaiDatHeThongPage() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "deposit_bank_config" },
    select: { value: true },
  });

  const saved = (config?.value ?? {}) as Record<string, string>;

  const bankName      = saved["bank_name"]      ?? DEFAULTS.bank_name;
  const accountNumber = saved["account_number"] ?? DEFAULTS.account_number;
  const accountHolder = saved["account_holder"] ?? DEFAULTS.account_holder;
  const bankBin       = saved["bank_bin"]       ?? DEFAULTS.bank_bin;

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
      />
    </div>
  );
}
