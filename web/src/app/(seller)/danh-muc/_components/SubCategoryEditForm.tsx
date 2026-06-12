"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubCategoryItem {
  id: string;
  name: string;
}

interface CategoryGroup {
  categoryName: string;
  subCategories: SubCategoryItem[];
}

interface Props {
  groups: CategoryGroup[];
  currentIds: string[];
}

export default function SubCategoryEditForm({ groups, currentIds }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(currentIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/seller/sub-categories", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subCategoryIds: selected }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Lưu thất bại. Vui lòng thử lại.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const totalSubs = groups.reduce((acc, g) => acc + g.subCategories.length, 0);

  if (totalSubs === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Danh mục của bạn chưa có danh mục con. Admin sẽ bổ sung sớm.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
          ✅ Đã lưu danh mục con thành công.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.categoryName}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{group.categoryName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {group.subCategories.map((sub) => (
              <label
                key={sub.id}
                className={`flex items-center gap-2.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${
                  selected.includes(sub.id)
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(sub.id)}
                  onChange={() => toggle(sub.id)}
                  className="w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-gray-700">{sub.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        {selected.length > 0 && (
          <p className="text-xs text-gray-500">Đã chọn {selected.length} danh mục con</p>
        )}
      </div>
    </div>
  );
}
