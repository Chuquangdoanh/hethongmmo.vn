"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  withdrawalId: string;
  bankName: string | null;
  maskedAccountNumber: string | null;
}

interface RevealedBankAccount {
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

export default function BankAccountCell({ withdrawalId, bankName, maskedAccountNumber }: Props) {
  const [revealed, setRevealed] = useState<RevealedBankAccount | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [loading, setLoading]   = useState(false);

  if (!maskedAccountNumber) {
    return <span className="text-gray-400">—</span>;
  }

  async function handleToggle() {
    if (revealed) {
      setShowFull((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate-withdrawals/${withdrawalId}/bank-account`);
      const json = await res.json() as { data?: RevealedBankAccount };
      if (json.data) {
        setRevealed(json.data);
        setShowFull(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const displayNumber = showFull && revealed?.bankAccountNumber ? revealed.bankAccountNumber : maskedAccountNumber;

  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="text-xs text-gray-700">{bankName ?? "—"}</p>
        <p className="font-mono text-xs font-semibold text-gray-800">{displayNumber}</p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="text-gray-400 hover:text-gray-600 disabled:opacity-50 shrink-0"
        title={showFull ? "Ẩn số tài khoản" : "Hiện số tài khoản"}
      >
        {showFull ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
