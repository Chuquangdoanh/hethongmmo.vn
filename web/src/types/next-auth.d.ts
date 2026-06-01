import type { DefaultSession } from "next-auth";
import type { Role, AccountStatus, SellerStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: AccountStatus;
      sellerStatus: SellerStatus;
      fullName: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    status: AccountStatus;
    sellerStatus: SellerStatus;
    fullName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    sellerStatus: SellerStatus;
    fullName: string;
  }
}
