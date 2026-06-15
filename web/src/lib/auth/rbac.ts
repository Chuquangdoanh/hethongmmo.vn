import type { Session } from "next-auth";
import type { Role, AccountStatus, SellerStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";

const ROLE_LEVELS: Record<Role, number> = {
  USER: 0,
  SELLER: 1,
  STAFF: 2,
  ADMIN: 3,
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string | null;
  fullName: string;
  role: Role;
  status: AccountStatus;
  sellerStatus: SellerStatus;
  requiresTwoFactor?: boolean;
};

export class AppAuthError extends AppError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, code, statusCode);
    this.name = "AppAuthError";
  }
}

function assertRole(session: Session | null, minRole: Role): AuthenticatedUser {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }
  const user = session.user as AuthenticatedUser;
  if (user.status === "BANNED") {
    throw new AppAuthError("Tài khoản đã bị khóa", "ACCOUNT_BANNED", 403);
  }
  if (ROLE_LEVELS[user.role] < ROLE_LEVELS[minRole]) {
    throw new AppAuthError("Bạn không có quyền thực hiện hành động này", "FORBIDDEN", 403);
  }
  return user;
}

/** Requires any authenticated user (USER and above). */
export function requireUser(session: Session | null): AuthenticatedUser {
  return assertRole(session, "USER");
}

/** Same as requireUser but skips the 2FA check — only use in 2FA setup/enable routes. */
export function requireUserFor2FASetup(session: Session | null): AuthenticatedUser {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }
  const user = session.user as AuthenticatedUser;
  if (user.status === "BANNED") {
    throw new AppAuthError("Tài khoản đã bị khóa", "ACCOUNT_BANNED", 403);
  }
  return user;
}

/** Requires SELLER role or above. */
export function requireSeller(session: Session | null): AuthenticatedUser {
  return assertRole(session, "SELLER");
}

/** Requires STAFF role or above. */
export function requireStaff(session: Session | null): AuthenticatedUser {
  return assertRole(session, "STAFF");
}

/** Requires ADMIN role exactly. */
export function requireAdmin(session: Session | null): AuthenticatedUser {
  if (!session?.user?.id) {
    throw new AppAuthError("Bạn chưa đăng nhập", "UNAUTHORIZED", 401);
  }
  const user = session.user as AuthenticatedUser;
  if (user.status === "BANNED") {
    throw new AppAuthError("Tài khoản đã bị khóa", "ACCOUNT_BANNED", 403);
  }
  if (user.role !== "ADMIN") {
    throw new AppAuthError("Chỉ Admin mới có quyền truy cập", "ADMIN_REQUIRED", 403);
  }
  return user;
}


