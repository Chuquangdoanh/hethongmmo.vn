"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Package } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";

const REGISTRATION_FEE = 50_000;

const BANKS = [
  "Vietcombank",
  "MBBank",
  "Techcombank",
  "VietinBank",
  "Agribank",
  "VPBank",
  "BIDV",
  "HDBank",
  "SeaBank",
  "Sacombank",
  "OCB",
  "VIB",
  "SHB",
  "LPBank",
];

interface Props {
  fullName: string;
  phone: string | null;
  email: string;
  balance: number;
  /** REJECTED or REVOKED → re-registration label */
  isReRegister?: boolean;
}

type Step = 1 | 2;
type StoreType = "TAI_NGUYEN_MMO" | "KHO_TAI_NGUYEN";

async function uploadFile(file: File, type: "cccd" | "portrait"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/user/upload?type=${type}`, { credentials: "include", method: "POST", body: fd });
  const json = await res.json() as { data?: { url?: string }; error?: string };
  if (!res.ok || !json.data?.url) {
    throw new Error(json.error ?? `Upload ${type} thất bại`);
  }
  return json.data.url;
}

interface SubCategory {
  id: string;
  name: string;
}

interface ResourceCategory {
  id: string;
  name: string;
  iconUrl: string | null;
  subCategories: SubCategory[];
}

export default function SellerRegisterModal({ fullName, phone, email, balance, isReRegister }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Resource categories from DB
  const [dbCategories, setDbCategories] = useState<ResourceCategory[]>([]);

  // Step 1 state
  const [storeType, setStoreType] = useState<StoreType>("TAI_NGUYEN_MMO");
  const [category, setCategory] = useState("");
  const [categoryDetail, setCategoryDetail] = useState("");
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [availableSubs, setAvailableSubs] = useState<SubCategory[]>([]);

  // Step 2 state
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [cccdFile, setCccdFile] = useState<File | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const cccdRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAfford = balance >= REGISTRATION_FEE;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/user/resource-categories", { credentials: "include" });
      const json = await res.json() as { data?: ResourceCategory[] };
      if (json.data) setDbCategories(json.data);
    } catch {
      // ignore — fallback: chỉ "Khác" vẫn có sẵn
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  function handleOpen() {
    setStep(1);
    setStoreType("TAI_NGUYEN_MMO");
    setCategory("");
    setCategoryDetail("");
    setSelectedSubIds([]);
    setAvailableSubs([]);
    setBankName("");
    setBankAccountNumber("");
    setBankAccountHolder("");
    setCccdFile(null);
    setPortraitFile(null);
    setError("");
    void fetchCategories();
    setOpen(true);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
  }

  function handleStep1Next() {
    if (!category) { setError("Vui lòng chọn danh mục"); return; }
    if (category === "Khác" && !categoryDetail.trim()) {
      setError("Vui lòng nhập chi tiết sản phẩm muốn đăng ký");
      return;
    }
    if (!canAfford) { setError(`Số dư không đủ. Cần tối thiểu ${formatVnd(REGISTRATION_FEE)}`); return; }
    setError("");
    setStep(2);
  }


  async function handleSubmit() {
    if (!bankName) { setError("Vui lòng chọn ngân hàng"); return; }
    if (!bankAccountNumber) { setError("Vui lòng nhập số tài khoản"); return; }
    if (!bankAccountHolder) { setError("Vui lòng nhập tên chủ tài khoản"); return; }
    if (!cccdFile) { setError("Vui lòng upload ảnh CCCD/CMND"); return; }
    if (!portraitFile) { setError("Vui lòng upload ảnh chân dung"); return; }

    setLoading(true);
    setError("");

    try {
      // Upload both images in parallel
      const [cccdUrl, portraitUrl] = await Promise.all([
        uploadFile(cccdFile, "cccd"),
        uploadFile(portraitFile, "portrait"),
      ]);

      // Save bank info + image URLs
      const profileRes = await fetch("/api/user/profile", { credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankAccountNumber, bankAccountHolder, cccdImageUrl: cccdUrl, portraitImageUrl: portraitUrl }),
      });
      const profileJson = await profileRes.json() as { error?: string };
      if (!profileRes.ok) {
        setError(profileJson.error ?? "Lỗi lưu thông tin ngân hàng");
        return;
      }

      // Submit seller registration (50k deduction)
      const finalCategory = categoryDetail.trim()
        ? `${category}: ${categoryDetail.trim()}`
        : category;

      const registerRes = await fetch("/api/seller/register", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: finalCategory, subCategoryIds: selectedSubIds, storeType }),
      });
      const registerJson = await registerRes.json() as { error?: string };
      if (!registerRes.ok) {
        setError(registerJson.error ?? "Đăng ký thất bại");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
      >
        {isReRegister ? "Đăng ký lại" : "Đăng ký ngay"}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#1e293b] px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏪</span>
                  <h2 className="text-base font-bold text-white">Đăng ký bán hàng</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Bước {step} / 2 — {step === 1 ? "Thông tin cơ bản" : "Ngân hàng & Xác minh"}
              </p>
            </div>

            {/* Step tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {[
                { n: 1 as Step, label: "1. Thông tin" },
                { n: 2 as Step, label: "2. Ngân hàng & CCCD" },
              ].map(({ n, label }) => (
                <div
                  key={n}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    step === n
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    step === n ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}>{n}</span>
                  {label}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <>
                  {/* Marketplace toggle */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                      Đăng ký bán tại <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN"] as StoreType[]).map((type) => {
                        const isActive = storeType === type;
                        const label = type === "TAI_NGUYEN_MMO" ? "Nguyên Liệu MMO" : "Kho Tài Nguyên";
                        const Icon  = type === "TAI_NGUYEN_MMO" ? FolderOpen : Package;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setStoreType(type)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 transition-all ${
                              isActive
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <span className={`flex items-center justify-center w-9 h-9 rounded-xl ${isActive ? "bg-blue-100" : "bg-gray-100"}`}>
                              <Icon size={20} strokeWidth={1.75} className={isActive ? "text-blue-600" : "text-gray-500"} />
                            </span>
                            <span className={`text-xs font-semibold text-center leading-tight ${isActive ? "text-blue-700" : "text-gray-600"}`}>
                              {label}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Đã chọn</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 1: Basic info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Họ và tên</label>
                      <input
                        readOnly
                        value={fullName}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Số điện thoại</label>
                      <input
                        readOnly
                        value={phone ?? ""}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Địa chỉ email</label>
                    <input
                      readOnly
                      value={email}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                      Danh mục đăng ký <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategory(val);
                        setCategoryDetail("");
                        setSelectedSubIds([]);
                        setAvailableSubs(dbCategories.find((c) => c.name === val)?.subCategories ?? []);
                        setError("");
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {dbCategories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>

                    {category && (
                      <div className="mt-2 space-y-3">
                        <div>
                          <input
                            type="text"
                            value={categoryDetail}
                            onChange={(e) => { setCategoryDetail(e.target.value); setError(""); }}
                            placeholder={category === "Khác" ? "Nhập sản phẩm bạn muốn đăng ký..." : "vd: Tài khoản quảng cáo, tài khoản game, tài khoản app..."}
                            maxLength={200}
                            className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                          <p className="mt-1 text-[10px] text-gray-400">
                            Mô tả cụ thể loại sản phẩm/dịch vụ bạn muốn bán
                          </p>
                        </div>

                        {availableSubs.length > 0 && (
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                              Danh mục con <span className="text-gray-400 font-normal normal-case">(chọn những gì bạn muốn bán)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                              {availableSubs.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedSubIds.includes(sub.id)}
                                    onChange={(e) => {
                                      setSelectedSubIds((prev) =>
                                        e.target.checked
                                          ? [...prev, sub.id]
                                          : prev.filter((id) => id !== sub.id),
                                      );
                                    }}
                                    className="w-4 h-4 accent-blue-600 shrink-0"
                                  />
                                  <span className="text-xs text-gray-700 leading-tight">{sub.name}</span>
                                </label>
                              ))}
                            </div>
                            {selectedSubIds.length > 0 && (
                              <p className="mt-1.5 text-[10px] text-blue-600 font-medium">
                                Đã chọn {selectedSubIds.length} danh mục con
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fee card */}
                  <div className={`rounded-xl p-4 border-2 ${canAfford ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Phí đăng ký</p>
                        <p className={`text-2xl font-bold ${canAfford ? "text-amber-600" : "text-red-600"}`}>
                          {formatVnd(REGISTRATION_FEE)}
                        </p>
                        <p className={`text-xs mt-0.5 ${canAfford ? "text-amber-700" : "text-red-600 font-medium"}`}>
                          {canAfford
                            ? `Số dư: ${formatVnd(balance)}`
                            : `Số dư không đủ (${formatVnd(balance)})`}
                        </p>
                      </div>
                      <span className="text-3xl">🪙</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: Bank + CCCD */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Ngân hàng <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => { setBankName(e.target.value); setError(""); }}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Số tài khoản <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => { setBankAccountNumber(e.target.value.replace(/\D/g, "")); setError(""); }}
                        placeholder="Nhập số TK..."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                      Tên chủ tài khoản <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => { setBankAccountHolder(e.target.value.toUpperCase()); setError(""); }}
                      placeholder="NGUYEN VAN A..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none tracking-wide"
                    />
                  </div>

                  {/* Image uploads */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* CCCD */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Ảnh CCCD/CMND <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={cccdRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { setCccdFile(e.target.files?.[0] ?? null); setError(""); }}
                      />
                      <button
                        type="button"
                        onClick={() => cccdRef.current?.click()}
                        className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors text-sm ${
                          cccdFile
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                        }`}
                      >
                        <span className="text-2xl">{cccdFile ? "✓" : "🪪"}</span>
                        <span className="text-[11px] font-medium px-1 text-center leading-tight">
                          {cccdFile ? cccdFile.name.slice(0, 20) + (cccdFile.name.length > 20 ? "..." : "") : "Chọn Ảnh CCCD"}
                        </span>
                      </button>
                    </div>

                    {/* Portrait */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Ảnh chân dung <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={portraitRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { setPortraitFile(e.target.files?.[0] ?? null); setError(""); }}
                      />
                      <button
                        type="button"
                        onClick={() => portraitRef.current?.click()}
                        className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors text-sm ${
                          portraitFile
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                        }`}
                      >
                        <span className="text-2xl">{portraitFile ? "✓" : "📷"}</span>
                        <span className="text-[11px] font-medium px-1 text-center leading-tight">
                          {portraitFile ? portraitFile.name.slice(0, 20) + (portraitFile.name.length > 20 ? "..." : "") : "Ảnh selfie/chân dung"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <span className="text-blue-500 text-sm shrink-0 mt-0.5">ℹ</span>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Thông tin ngân hàng dùng để nhận tiền rút. Ảnh CCCD và chân dung để xác minh danh tính người bán.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {step === 1 ? (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleStep1Next}
                    disabled={!canAfford}
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tiếp theo →
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setStep(1); setError(""); }}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Đang gửi...
                      </>
                    ) : (
                      "→ Gửi yêu cầu"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
