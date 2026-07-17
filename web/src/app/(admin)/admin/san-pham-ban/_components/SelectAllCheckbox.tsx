"use client";

import { useBulkSelection } from "./BulkSelectionContext";

interface Props {
  ids: string[];
}

export default function SelectAllCheckbox({ ids }: Props) {
  const { selected, toggleAll } = useBulkSelection();
  const isAllSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const isIndeterminate = !isAllSelected && ids.some((id) => selected.has(id));

  return (
    <input
      type="checkbox"
      checked={isAllSelected}
      ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
      onChange={() => toggleAll(ids)}
      aria-label="Chọn tất cả sản phẩm"
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
  );
}
