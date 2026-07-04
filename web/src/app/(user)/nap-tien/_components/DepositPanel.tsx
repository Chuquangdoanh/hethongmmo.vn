"use client";

import { useState } from "react";
import { QrCode, AlertTriangle } from "lucide-react";
import CopyButton from "@/components/shared/CopyButton";

interface Props {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankBin: string;
  transferContent: string;
  taxPercent?: number;
}

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];
const MIN_AMOUNT = 50_000;

function formatVndShort(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}tr`;
  return `${n / 1_000}k`;
}

function formatAmount(n: number) {
  return n.toLocaleString("vi-VN") + " VNĐ";
}

export default function DepositPanel({ bankName, accountNumber, accountHolder, bankBin, transferContent, taxPercent = 0 }: Props) {
  const [selected, setSelected] = useState(100_000);
  const [custom, setCustom] = useState("");

  const customNum = custom ? parseInt(custom, 10) || 0 : 0;
  const isBelowMin = custom !== "" && customNum > 0 && customNum < MIN_AMOUNT;
  const amount = custom ? customNum || selected : selected;

  // Mô hình B: thuế cộng lên trên. amount = số dư user muốn nhận; transferAmount = số phải chuyển (đã +thuế).
  const hasTax         = taxPercent > 0;
  const transferAmount = hasTax ? Math.round(amount * (100 + taxPercent) / 100) : amount;

  const qrUrl =
    `https://img.vietqr.io/image/${bankBin}-${accountNumber}-qr_only.jpg` +
    `?amount=${transferAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountHolder)}`;

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setCustom(raw);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <QrCode size={15} className="text-blue-600" />
        </div>
        Quét mã QR để nạp tiền
      </h3>

      {/* Amount selector */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2.5">Chọn số tiền nạp</p>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => { setSelected(amt); setCustom(""); }}
              className={`py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors border ${
                selected === amt && !custom
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {formatVndShort(amt)}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={custom}
              onChange={handleCustomChange}
              placeholder={formatAmount(selected)}
              className={`w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none pr-12 ${
                isBelowMin
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-200 focus:border-blue-500"
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">VND</span>
          </div>
          {isBelowMin && (
            <p className="text-xs text-red-500">Số tiền nạp tối thiểu là 50.000đ</p>
          )}
        </div>

        {/* Số tiền cần chuyển (đã gồm thuế) */}
        {hasTax && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-amber-700">Số tiền cần chuyển (gồm {taxPercent}% thuế)</span>
              <span className="text-base font-bold text-amber-700">{formatAmount(transferAmount)}</span>
            </div>
            <p className="text-[11px] text-amber-600 mt-1">
              Bạn chuyển {formatAmount(transferAmount)} → tài khoản nhận {formatAmount(amount)}.
            </p>
          </div>
        )}
      </div>

      {/* QR + Bank info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* QR code */}
        <div className="flex flex-col items-center">
          <div className="border border-gray-200 rounded-xl p-3 bg-white inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR nạp tiền"
              width={180}
              height={180}
              className="rounded-lg"
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-[11px] font-semibold text-blue-700">VIETQR</p>
            <p className="text-[11px] text-gray-500">{bankName} · {accountHolder}</p>
          </div>
        </div>

        {/* Bank details */}
        <div className="space-y-2.5">
          <InfoField label="NGÂN HÀNG"     value={bankName}      />
          <InfoField label="SỐ TÀI KHOẢN"  value={accountNumber} />
          <InfoField label="CHỦ TÀI KHOẢN" value={accountHolder} />
        </div>
      </div>

      {/* Transfer content — highlighted */}
      <div className="rounded-xl bg-orange-50 border-2 border-orange-300 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-orange-500 shrink-0" />
              Nội dung chuyển khoản (bắt buộc)
            </p>
            <p className="text-base font-bold text-orange-600 tracking-widest">{transferContent}</p>
          </div>
          
        </div>
      </div>

      {/* Instructions */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2.5">Hướng dẫn nạp tiền</p>
        <ol className="space-y-1.5">
          {[
            "Mở ứng dụng ngân hàng hoặc ví điện tử",
            "Chọn số tiền cần nạp",
            "Quét mã QR hiển thị bên cạnh",
            "Kiểm tra thông tin và xác nhận chuyển khoản",
            "Tiền sẽ được cộng tự động sau 1 – 3 phút",
            "Số tiền nạp tối thiểu 50.000đ",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-px">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function InfoField({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800 truncate">{value}</span>
        {copy && <CopyButton text={value} />}
      </div>
    </div>
  );
}
