/**
 * Full Auth.js v5 entry point — Node.js runtime only.
 * NOT imported in middleware (use authConfig directly there).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/user.schema";
import { logger } from "@/lib/utils/logger";
import type { Role, AccountStatus, SellerStatus } from "@prisma/client";

class AccountBannedError extends CredentialsSignin {
  code = "ACCOUNT_BANNED";
}

class AccountLockedError extends CredentialsSignin {
  code = "ACCOUNT_LOCKED";
}

class RequireOtpError extends CredentialsSignin {
  code = "REQUIRE_OTP";
}

const FIVE_MIN_MS = 5 * 60 * 1000;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // First sign-in: populate token from authorize() return value
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.sellerStatus = (user as { sellerStatus?: string }).sellerStatus ?? "NONE";
        token.fullName = (user as { fullName?: string }).fullName ?? "";
        token.statusCheckedAt = Date.now();
        return token;
      }

      // Periodic status re-check from DB every 5 minutes
      // Catches status/role changes (e.g. admin bans user) without requiring re-login
      const checkedAt = token.statusCheckedAt as number | undefined;
      if (token.id && (!checkedAt || Date.now() - checkedAt > FIVE_MIN_MS)) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, role: true, sellerStatus: true },
          });
          if (fresh) {
            token.status = fresh.status;
            token.role = fresh.role;
            token.sellerStatus = fresh.sellerStatus;
            token.statusCheckedAt = Date.now();
          }
        } catch {
          // Keep stale token if DB is unavailable — don't break auth
        }
      }

      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const userAgent = request?.headers?.get("user-agent") ?? "unknown";

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            passwordHash: true,
            role: true,
            status: true,
            sellerStatus: true,
            failedLoginCount: true,
            lockedUntil: true,
          },
        });

        const recordAttempt = (success: boolean, reason?: string) =>
          prisma.loginAttempt
            .create({
              data: {
                userId: user?.id ?? null,
                email,
                ipAddress: ip,
                userAgent,
                success,
                failReason: reason ?? null,
              },
            })
            .catch((e: unknown) =>
              logger.error({ err: e }, "Failed to record login attempt"),
            );

        if (!user) {
          void recordAttempt(false, "USER_NOT_FOUND");
          return null;
        }

        if (user.status === "BANNED") {
          void recordAttempt(false, "ACCOUNT_BANNED");
          throw new AccountBannedError();
        }

        if (user.status === "DELETED") {
          void recordAttempt(false, "ACCOUNT_DELETED");
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          void recordAttempt(false, "ACCOUNT_LOCKED");
          throw new AccountLockedError();
        }

        if (user.passwordHash === "$RESET_REQUIRED$") {
          void recordAttempt(false, "PASSWORD_RESET_REQUIRED");
          throw new Error("PASSWORD_RESET_REQUIRED");
        }

        const valid = await verifyPassword(user.passwordHash, password);

        if (!valid) {
          const newFailCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: newFailCount,
              lockedUntil:
                newFailCount >= 5
                  ? new Date(Date.now() + 15 * 60 * 1000)
                  : undefined,
            },
          });
          void recordAttempt(false, "INVALID_PASSWORD");
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ip,
          },
        });

        void recordAttempt(true);
        logger.info({ userId: user.id, email: user.email }, "Login successful");

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          fullName: user.fullName,
          role: user.role as Role,
          status: user.status as AccountStatus,
          sellerStatus: user.sellerStatus as SellerStatus,
        };
      },
    }),
  ],
});
