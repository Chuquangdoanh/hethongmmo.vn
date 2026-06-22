"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  initialBankName:      string;
  initialAccountNumber: string;
  initialAccountHolder: string;
  initialBankBin:       string;
}

export default function DepositBankForm({
  initialBankName,
  initialAccountNumber,
  initialAccountHolder,
  initialBankBin,
}: Props) {
  const [bankName,      setBankName]      = useState(initialBankName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder);
  const [bankBin,       setBankBin]       = useState(initialBankBin);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-config/deposit-bank", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name:      bankName.trim(),
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim(),
          bank_bin:       bankBin.trim(),
        }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Lưu thất bại");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CreditCard size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Tài khoản nạp tiền</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Thông tin ngân hàng hiển thị cho user khi nạp tiền
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Ngân hàng"
            placeholder="Ví dụ: MB Bank"
            value={bankName}
            onChange={setBankName}
          />
          <Field
            label="Bank BIN (cho VietQR)"
            placeholder="Ví dụ: MB, VCB, TCB"
            value={bankBin}
            onChange={setBankBin}
          />
        </div>

        <Field
          label="Số tài khoản"
          placeholder="Ví dụ: 0393118789"
          value={accountNumber}
          onChange={setAccountNumber}
          required
        />

        <Field
          label="Tên chủ tài khoản"
          placeholder="Ví dụ: NGUYEN VAN A"
          value={accountHolder}
          onChange={setAccountHolder}
          hint="Viết IN HOA, đúng tên in trên thẻ"
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle size={15} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700">Đã lưu thành công! Trang nạp tiền của user sẽ hiển thị thông tin mới.</p>
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  hint,
  required,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
