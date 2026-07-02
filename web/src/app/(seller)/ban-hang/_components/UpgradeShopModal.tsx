"use client";

import { useState, useMemo } from "react";
import { formatVnd } from "@/lib/utils/format";
import type { SlotPackage } from "@/lib/services/seller.service";

interface SubCat {
  id: string;
  name: string;
  categoryName: string;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
}

interface Props {
  packages: SlotPackage[];
  currentSlots: number;
  userBalance: number;
  sellerCategory: string | null;
  availableSubCats: SubCat[];
  selectedSubCatIds: string[];
}

type Tab = "slots" | "shop";
type Page = "kho" | "nguyen-lieu";

const PAGES: { key: Page; label: string; filter: (s: SubCat) => boolean }[] = [
  { key: "kho",        label: "Kho tài nguyên", filter: (s) => s.showInKhoTaiNguyen },
  { key: "nguyen-lieu", label: "Nguyên liệu",    filter: (s) => s.showInTaiNguyenMmo },
];

export default function UpgradeShopModal({
  packages,
  currentSlots,
  userBalance,
  sellerCategory,
  availableSubCats,
  selectedSubCatIds: initialSelected,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("slots");

  // Slot tab state
  const [selectedPkg, setSelectedPkg] = useState<SlotPackage | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [slotSuccess, setSlotSuccess] = useState(false);

  // Shop tab state
  const [activePage, setActivePage] = useState<Page>("kho");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(initialSelected));
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");
  const [catSuccess, setCatSuccess] = useState(false);

  // Group sub-categories theo categoryName, filter theo activePage
  const categoryGroups = useMemo(() => {
    const pageFilter = PAGES.find((p) => p.key === activePage)?.filter ?? (() => true);
    const map = new Map<string, SubCat[]>();
    for (const sub of availableSubCats) {
      if (!pageFilter(sub)) continue;
      const list = map.get(sub.categoryName) ?? [];
      list.push(sub);
      map.set(sub.categoryName, list);
    }
    return Array.from(map.entries()).map(([name, subs]) => ({ name, subs }));
  }, [availableSubCats, activePage]);

  function handleOpen() {
    setSelectedPkg(null);
    setSlotError("");
    setSlotSuccess(false);
    setCatError("");
    setCatSuccess(false);
    setActivePage("kho");
    setActiveTab("slots");
    setIsOpen(true);
  }

  function handleClose() {
    if (slotLoading || catLoading) return;
    setIsOpen(false);
  }

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBuySlots() {
    if (!selectedPkg) return;
    setSlotError("");
    setSlotLoading(true);
    try {
      const res = await fetch("/api/seller/buy-slots", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: selectedPkg.slots }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setSlotError(json.error ?? "Có lỗi xảy ra, thử lại sau");
        return;
      }
      setSlotSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setSlotError("Lỗi kết nối, thử lại sau");
    } finally {
      setSlotLoading(false);
    }
  }

  async function handleSaveCats() {
    setCatError("");
    setCatLoading(true);
    try {
      const res = await fetch("/api/seller/sub-categories", {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subCategoryIds: [...selectedCats] }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setCatError(json.error ?? "Có lỗi xảy ra");
        return;
      }
      setCatSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setCatError("Lỗi kết nối, thử lại sau");
    } finally {
      setCatLoading(false);
    }
  }

  const balanceAfter = selectedPkg ? userBalance - selectedPkg.price : userBalance;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-[#0052cc] transition-colors"
      >
        Nâng cấp gian hàng
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Nâng cấp gian hàng</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tăng slot sản phẩm hoặc quản lý danh mục bán hàng
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={slotLoading || catLoading}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg leading-none disabled:opacity-40"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab("slots")}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === "slots"
                    ? "text-violet-600 border-b-2 border-violet-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Đăng ký slot
              </button>
              <button
                onClick={() => setActiveTab("shop")}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === "shop"
                    ? "text-violet-600 border-b-2 border-violet-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Nâng cấp gian hàng
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">

              {/* ── Tab: Đăng ký slot ── */}
              {activeTab === "slots" && (
                <>
                  <div className="flex items-center justify-between text-xs rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                    <span className="text-blue-700 font-medium">Gói hiện tại của bạn:</span>
                    <span className="font-bold text-blue-800">{currentSlots} slot sản phẩm</span>
                  </div>

                  <div className="space-y-2">
                    {packages.map((pkg) => {
                      const isCurrentOrLower = pkg.slots <= currentSlots;
                      const canAfford = userBalance >= pkg.price;
                      const isDisabled = isCurrentOrLower || !canAfford;
                      const isSelected = selectedPkg?.slots === pkg.slots;

                      return (
                        <button
                          key={pkg.slots}
                          type="button"
                          onClick={() => { if (!isDisabled) setSelectedPkg(pkg); }}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                            isSelected
                              ? "border-violet-500 bg-violet-50"
                              : isDisabled
                              ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                              : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-800">Gói {pkg.slots} slot</p>
                              {isCurrentOrLower && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 uppercase tracking-wide">
                                  {pkg.slots === currentSlots ? "Hiện tại" : "Thấp hơn"}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {isCurrentOrLower
                                ? "Không thể hạ xuống gói thấp hơn"
                                : `Nâng từ ${currentSlots} → ${pkg.slots} slot`}
                            </p>
                            {!isCurrentOrLower && !canAfford && (
                              <p className="text-[10px] text-red-500 mt-0.5">Số dư không đủ</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold ${isDisabled ? "text-gray-400" : "text-violet-600"}`}>
                              {formatVnd(pkg.price)}
                            </p>
                            {isSelected && (
                              <p className="text-[10px] text-violet-500 mt-0.5">Đã chọn</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
                    <span className="text-gray-500">Số dư hiện tại:</span>
                    <span className="font-bold text-gray-800">{formatVnd(userBalance)}</span>
                  </div>

                  {selectedPkg && !slotSuccess && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                      <p className="text-xs text-amber-800">
                        Nâng cấp từ <strong>{currentSlots} slot</strong> lên{" "}
                        <strong>{selectedPkg.slots} slot</strong> · Chi phí:{" "}
                        <strong>{formatVnd(selectedPkg.price)}</strong>. Số dư còn lại:{" "}
                        <strong className={balanceAfter < 0 ? "text-red-600" : "text-emerald-700"}>
                          {formatVnd(balanceAfter)}
                        </strong>
                      </p>
                    </div>
                  )}

                  {slotError && <p className="text-sm text-red-500 font-medium">{slotError}</p>}
                  {slotSuccess && (
                    <p className="text-sm text-emerald-600 font-medium">
                      Đã nâng cấp thành công! Đang tải lại...
                    </p>
                  )}
                </>
              )}

              {/* ── Tab: Nâng cấp gian hàng ── */}
              {activeTab === "shop" && (
                <>
                  {/* Badge hạng mục chính — chỉ để thông tin */}
                  <div className={`flex items-center justify-between text-xs rounded-lg px-3 py-2.5 border ${
                    sellerCategory ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-200"
                  }`}>
                    <span className={`font-medium ${sellerCategory ? "text-blue-700" : "text-amber-700"}`}>
                      Hạng mục chính:
                    </span>
                    <span className={`font-bold ${sellerCategory ? "text-blue-800" : "text-amber-600"}`}>
                      {sellerCategory ?? "Chưa thiết lập"}
                    </span>
                  </div>

                  {/* Page tabs: Kho tài nguyên / Nguyên liệu */}
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    {PAGES.map((page) => (
                      <button
                        key={page.key}
                        type="button"
                        onClick={() => setActivePage(page.key)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activePage === page.key
                            ? "bg-white text-violet-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {page.label}
                      </button>
                    ))}
                  </div>

                  {categoryGroups.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Chưa có danh mục con nào trong trang này
                    </p>
                  ) : (
                    /* Hiển thị các hạng mục của page đang chọn */
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">
                        Chọn danh mục con từ các hạng mục bạn muốn bán:
                      </p>
                      {categoryGroups.map((group) => {
                        const isPrimary = group.name === sellerCategory;
                        return (
                          <div key={group.name}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                {group.name}
                              </p>
                              {isPrimary && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase tracking-wide">
                                  Chính
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {group.subs.map((cat) => {
                                const isSelected = selectedCats.has(cat.id);
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCat(cat.id)}
                                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-xs transition-all ${
                                      isSelected
                                        ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold"
                                        : "border-gray-200 hover:border-violet-300 text-gray-600"
                                    }`}
                                  >
                                    <CheckBox checked={isSelected} />
                                    <span className="truncate">{cat.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {catError && <p className="text-sm text-red-500 font-medium">{catError}</p>}
                  {catSuccess && (
                    <p className="text-sm text-emerald-600 font-medium">
                      Đã lưu danh mục! Đang tải lại...
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={slotLoading || catLoading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>

              {activeTab === "slots" && (
                <button
                  type="button"
                  onClick={handleBuySlots}
                  disabled={!selectedPkg || slotLoading || slotSuccess}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {slotLoading ? "Đang xử lý..." : "Xác nhận mua"}
                </button>
              )}

              {activeTab === "shop" && availableSubCats.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveCats}
                  disabled={catLoading || catSuccess}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {catLoading ? "Đang lưu..." : "Lưu danh mục"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? "bg-violet-500 border-violet-500" : "border-gray-300"
      }`}
    >
      {checked && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
    </span>
  );
}
