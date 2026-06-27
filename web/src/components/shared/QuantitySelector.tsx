"use client";

const MAX_QUANTITY_HARD_LIMIT = 100;

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = MAX_QUANTITY_HARD_LIMIT,
  disabled = false,
}: QuantitySelectorProps) {
  const clampedMax = Math.min(max, MAX_QUANTITY_HARD_LIMIT);

  function handleDecrement() {
    if (value > min) onChange(value - 1);
  }

  function handleIncrement() {
    if (value < clampedMax) onChange(value + 1);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const n = parseInt(e.target.value, 10);
    if (isNaN(n)) return;
    onChange(Math.min(clampedMax, Math.max(min, n)));
  }

  return (
    <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold text-base select-none border-r border-gray-300"
        aria-label="Giảm số lượng"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={handleInput}
        min={min}
        max={clampedMax}
        disabled={disabled}
        className="w-10 h-8 text-center text-sm font-semibold text-gray-800 bg-white focus:outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Số lượng"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= clampedMax}
        className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold text-base select-none border-l border-gray-300"
        aria-label="Tăng số lượng"
      >
        +
      </button>
    </div>
  );
}
