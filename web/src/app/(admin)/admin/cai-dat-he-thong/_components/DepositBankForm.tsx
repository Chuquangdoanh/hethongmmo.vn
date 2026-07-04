"use client";

import { useState } from "react";
import { CreditCard, Shield, CheckCircle, AlertCircle, Plus, Trash2, Percent } from "lucide-react";

interface Props {
  initialBankName:      string;
  initialAccountNumber: string;
  initialAccountHolder: string;
  initialBankBin:       string;
  initialIpWhitelist:   string[];
  initialTaxPercent:    number;
}

export default function DepositBankForm({
  initialBankName,
  initialAccountNumber,
  initialAccountHolder,
  initialBankBin,
  initialIpWhitelist,
  initialTaxPercent,
}: Props) {
  const [bankName,      setBankName]      = useState(initialBankName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder);
  const [bankBin,       setBankBin]       = useState(initialBankBin);
  const [ipList,        setIpList]        = useState<string[]>(initialIpWhitelist);
  const [newIp,         setNewIp]         = useState("");
  const [taxPercent,    setTaxPercent]    = useState(String(initialTaxPercent));
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);

  const taxNum          = Number(taxPercent) || 0;
  const transferPer100k = Math.round(100_000 * (100 + taxNum) / 100);

  function addIp() {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    if (ipList.includes(trimmed)) { setNewIp(""); return; }
    setIpList((prev) => [...prev, trimmed]);
    setNewIp("");
  }

  function removeIp(ip: string) {
    setIpList((prev) => prev.filter((x) => x !== ip));
  }

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
          ip_whitelist:   ipList,
          tax_percent:    Math.min(100, Math.max(0, taxNum)),
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
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">

      {/* ── Tài khoản ngân hàng ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CreditCard size={18} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tài khoản nạp tiền</h2>
            <p className="text-xs text-gray-500 mt-0.5">Thông tin ngân hàng hiển thị cho user khi nạp tiền</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ngân hàng" placeholder="Ví dụ: MB Bank" value={bankName} onChange={setBankName} />
            <Field label="Bank BIN (VietQR)" placeholder="Ví dụ: MB, VCB, TCB" value={bankBin} onChange={setBankBin} />
          </div>
          <Field label="Số tài khoản" placeholder="Ví dụ: 0393118789" value={accountNumber} onChange={setAccountNumber} required />
          <Field label="Tên chủ tài khoản" placeholder="Ví dụ: NGUYEN VAN A" value={accountHolder} onChange={setAccountHolder} hint="Viết IN HOA, đúng tên in trên thẻ" />
        </div>
      </div>

      {/* ── Thuế nạp tiền tự động ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Percent size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Thuế nạp tiền tự động</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chỉ áp cho nạp tự động qua ngân hàng. Đặt 0 = không thu thuế. Không ảnh hưởng admin nạp tay.
            </p>
          </div>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phần trăm thuế (%)</label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-9 text-sm text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Ví dụ: user muốn nhận <strong>100.000đ</strong> → cần chuyển{" "}
            <strong className="text-amber-600">{transferPer100k.toLocaleString("vi-VN")}đ</strong>
            {taxNum > 0 && <> (gồm {(transferPer100k - 100_000).toLocaleString("vi-VN")}đ thuế, sàn giữ)</>}
          </p>
        </div>
      </div>

      {/* ── IP Whitelist SePay ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">IP Whitelist SePay</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chỉ cho phép webhook từ các IP này. Để trống = không giới hạn IP.
            </p>
          </div>
        </div>

        {/* Danh sách IP hiện tại */}
        {ipList.length > 0 ? (
          <div className="space-y-2 mb-4">
            {ipList.map((ip) => (
              <div key={ip} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <code className="text-sm font-mono text-gray-800">{ip}</code>
                <button
                  type="button"
                  onClick={() => removeIp(ip)}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 mb-4 text-center">
            <p className="text-xs text-gray-400">Chưa có IP nào — mọi IP đều được nhận webhook</p>
          </div>
        )}

        {/* Thêm IP mới */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập IP SePay, ví dụ: 103.226.250.119"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIp(); } }}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
          <button
            type="button"
            onClick={addIp}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={14} />
            Thêm
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          IP SePay trên vps docker 
        </p>
      </div>

      {/* ── Feedback ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">Đã lưu thành công! Webhook SePay áp dụng trong vòng 60 giây.</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, placeholder, value, onChange, hint, required,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
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
