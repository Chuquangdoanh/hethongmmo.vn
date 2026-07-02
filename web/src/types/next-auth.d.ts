import type { DefaultSession } from "next-auth";
import type { Role, AccountStatus, SellerStatus, AffiliateStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: AccountStatus;
      sellerStatus: SellerStatus;
      fullName: string;
      requiresTwoFactor: boolean;
      jti?: string;
      isAffiliate?: boolean;
      affiliateStatus?: AffiliateStatus;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    status: AccountStatus;
    sellerStatus: SellerStatus;
    fullName: string;
    requiresTwoFactor?: boolean;
    isAffiliate?: boolean;
    affiliateStatus?: AffiliateStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    sellerStatus: SellerStatus;
    fullName: string;
    requiresTwoFactor?: boolean;
    statusCheckedAt?: number;
    jti?: string;
    isAffiliate?: boolean;
    affiliateStatus?: AffiliateStatus;
  }
}
