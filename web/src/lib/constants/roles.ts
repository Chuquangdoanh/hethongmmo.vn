export const ROLES = {
  USER: "USER",
  SELLER: "SELLER",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
