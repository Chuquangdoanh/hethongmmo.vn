"use client";

import { createContext, useContext, useMemo } from "react";
import type { PermissionCode } from "@/lib/constants/modules";

interface AdminPermissionContext {
  isAdmin: boolean;
  /** Set of PermissionCode strings. Empty when isAdmin=true (admin bypasses all checks). */
  permissions: Set<PermissionCode>;
  /** Returns true when user can perform the action. Always true for ADMIN. */
  can: (code: PermissionCode) => boolean;
}

const Ctx = createContext<AdminPermissionContext | null>(null);

export function AdminPermissionProvider({
  children,
  isAdmin,
  permissions: permList,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  permissions: PermissionCode[];
}) {
  const value = useMemo<AdminPermissionContext>(() => {
    const permissions = new Set(permList);
    return {
      isAdmin,
      permissions,
      can: (code) => isAdmin || permissions.has(code),
    };
  }, [isAdmin, permList]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminPermissions(): AdminPermissionContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminPermissions must be used inside AdminPermissionProvider");
  return ctx;
}
