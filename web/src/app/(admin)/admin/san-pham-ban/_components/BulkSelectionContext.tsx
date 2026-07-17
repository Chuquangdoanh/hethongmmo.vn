"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BulkSelectionContextValue {
  selected: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
}

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

export function useBulkSelection(): BulkSelectionContextValue {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) throw new Error("useBulkSelection phải dùng trong BulkSelectionProvider");
  return ctx;
}

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  function clear() {
    setSelected(new Set());
  }

  return (
    <BulkSelectionContext.Provider value={{ selected, toggleOne, toggleAll, clear }}>
      {children}
    </BulkSelectionContext.Provider>
  );
}
