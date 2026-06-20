"use client";

import { useAdminPermissions } from "./PermissionProvider";
import type { PermissionCode } from "@/lib/constants/modules";

interface Props {
  permission: PermissionCode;
  children: React.ReactNode;
  /** Render this instead of nothing when permission is missing. Default: null. */
  fallback?: React.ReactNode;
}

/**
 * Render children only when current admin user has the given permission.
 * ADMIN always sees children. STAFF sees only what their permissions allow.
 *
 * Usage:
 *   <PermissionGate permission="users:delete">
 *     <DeleteButton />
 *   </PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }: Props) {
  const { can } = useAdminPermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
