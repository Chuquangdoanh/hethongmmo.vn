"use client";

import { useBulkSelection } from "./BulkSelectionContext";

interface Props {
  productId: string;
}

export default function ProductRowCheckbox({ productId }: Props) {
  const { selected, toggleOne } = useBulkSelection();

  return (
    <input
      type="checkbox"
      checked={selected.has(productId)}
      onChange={() => toggleOne(productId)}
      aria-label="Chọn sản phẩm"
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
  );
}
