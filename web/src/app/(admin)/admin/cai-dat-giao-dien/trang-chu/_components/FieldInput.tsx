"use client";

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  hint?: string;
}

export function FieldText({ label, value, onChange, placeholder, textarea, rows = 3, hint }: TextProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

interface GridProps {
  cols?: 2 | 3;
  children: React.ReactNode;
}

export function FieldGrid({ cols = 2, children }: GridProps) {
  return (
    <div className={`grid gap-4 ${cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
      {children}
    </div>
  );
}

interface SectionDivProps {
  label: string;
}

export function FieldSectionLabel({ label }: SectionDivProps) {
  return <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">{label}</p>;
}
