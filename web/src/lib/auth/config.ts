/**
 * Edge-safe Auth.js config — NO Prisma or Node.js-only imports.
 * Used by middleware and combined with providers in src/auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [], // Credentials provider added in src/auth.ts (Node.js only)

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Populate JWT on first sign-in from authorize() return value
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.sellerStatus = (user as { sellerStatus?: string }).sellerStatus ?? "NONE";
        token.fullName = (user as { fullName?: string }).fullName ?? "";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as never;
      session.user.status = token.status as never;
      session.user.sellerStatus = token.sellerStatus as never;
      session.user.fullName = (token.fullName ?? "") as string;
      session.user.requiresTwoFactor = (token.requiresTwoFactor ?? false) as boolean;
      session.user.jti = token.jti as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/dang-nhap",
    error: "/dang-nhap",
  },

  trustHost: true,
};
