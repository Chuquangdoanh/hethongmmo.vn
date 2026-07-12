"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FolderTree } from "lucide-react";

export interface CategoryOption {
  name: string;
}

export interface SubCategoryOption {
  id: string;
  name: string;
  categoryName: string;
}

interface Props {
  basePath: string;
  categories: CategoryOption[];
  subCategories: SubCategoryOption[];
  categoryParamKey?: string;
  subCategoryParamKey?: string;
  className?: string;
}

export default function CategorySubCategoryFilter({
  basePath,
  categories,
  subCategories,
  categoryParamKey = "category",
  subCategoryParamKey = "subCategoryId",
  className = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedCategory = searchParams.get(categoryParamKey) ?? "";
  const selectedSubCategoryId = searchParams.get(subCategoryParamKey) ?? "";

  function navigate(nextParams: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page");
    for (const [key, value] of Object.entries(nextParams)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  function handleCategoryChange(value: string) {
    // Đổi danh mục cha → reset danh mục con vì con phụ thuộc cha
    navigate({ [categoryParamKey]: value || null, [subCategoryParamKey]: null });
  }

  function handleSubCategoryChange(value: string) {
    navigate({ [subCategoryParamKey]: value || null });
  }

  const visibleSubCategories = selectedCategory
    ? subCategories.filter((s) => s.categoryName === selectedCategory)
    : subCategories;

  const selectClass = "h-9 px-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 hover:border-blue-400 transition-colors cursor-pointer";

  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 bg-white rounded-xl border border-gray-200 px-3.5 py-2.5 transition-opacity ${
        isPending ? "opacity-60 pointer-events-none" : ""
      } ${className}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 shrink-0">
        <FolderTree size={14} strokeWidth={2} />
        Danh mục
      </span>
      <select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} className={selectClass}>
        <option value="">Tất cả danh mục cha</option>
        {categories.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={selectedSubCategoryId} onChange={(e) => handleSubCategoryChange(e.target.value)} className={selectClass}>
        <option value="">Tất cả danh mục con</option>
        {visibleSubCategories.map((s) => (
          <option key={s.id} value={s.id}>
            {selectedCategory ? s.name : `${s.categoryName} / ${s.name}`}
          </option>
        ))}
      </select>
    </div>
  );
}
