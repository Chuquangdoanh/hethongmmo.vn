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
import { isSessionDenied } from "@/lib/auth/session-denylist";
import { linkCustomerToAffiliate } from "@/lib/services/affiliate.service";
import type { Role, AccountStatus, SellerStatus, AffiliateStatus } from "@prisma/client";

class AccountBannedError extends CredentialsSignin {
  code = "ACCOUNT_BANNED";
}

class AccountLockedError extends CredentialsSignin {
  code = "ACCOUNT_LOCKED";
}

class RequireOtpError extends CredentialsSignin {
  code = "REQUIRE_OTP";
}

class CaptchaFailedError extends CredentialsSignin {
  code = "CAPTCHA_FAILED";
}

class PasswordResetRequiredError extends CredentialsSignin {
  code = "PASSWORD_RESET_REQUIRED";
}

function readCookie(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const FIVE_MIN_MS = 30 * 1000; // 30s — đủ nhanh để role/sellerStatus propagate sau khi admin duyệt

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // Force DB re-check on session update (e.g. after 2FA setup)
      if (trigger === "update") {
        token.statusCheckedAt = 0;
        return token;
      }

      // First sign-in: populate token from authorize() return value
      if (user) {
        token.jti = crypto.randomUUID();
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.sellerStatus = (user as { sellerStatus?: string }).sellerStatus ?? "NONE";
        token.fullName = (user as { fullName?: string }).fullName ?? "";
        token.requiresTwoFactor = (user as { requiresTwoFactor?: boolean }).requiresTwoFactor ?? false;
        token.isAffiliate = (user as { isAffiliate?: boolean }).isAffiliate ?? false;
        token.affiliateStatus = (user as { affiliateStatus?: string }).affiliateStatus as AffiliateStatus | undefined;
        token.statusCheckedAt = Date.now();
        return token;
      }

      // Periodic status re-check from DB every 5 minutes
      // Catches status/role changes (e.g. admin bans user) without requiring re-login
      const checkedAt = token.statusCheckedAt as number | undefined;
      if (token.id && (!checkedAt || Date.now() - checkedAt > FIVE_MIN_MS)) {
        // Check session denylist (revokes stolen cookies after logout)
        if (token.jti) {
          try {
            const denied = await isSessionDenied(token.jti);
            if (denied) return null;
          } catch {
            // fail-open — don't break auth if Redis is unavailable
          }
        }

        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, role: true, sellerStatus: true, twoFactorEnabled: true, isAffiliate: true, affiliateStatus: true },
          });
          if (fresh) {
            token.status = fresh.status;
            token.role = fresh.role;
            token.sellerStatus = fresh.sellerStatus;
            token.requiresTwoFactor = (fresh.role === "ADMIN" || fresh.role === "STAFF") && !fresh.twoFactorEnabled;
            token.isAffiliate = fresh.isAffiliate;
            token.affiliateStatus = fresh.affiliateStatus;
            token.statusCheckedAt = Date.now();
          } else {
            // User no longer exists in DB — revoke session to force re-login
            return null;
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
        captchaToken: {},
      },
      async authorize(credentials, request) {
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const userAgent = request?.headers?.get("user-agent") ?? "unknown";

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, captchaToken } = parsed.data;

        // Fail-closed: khi Turnstile đã cấu hình, bắt buộc phải có token hợp lệ
        const turnstileConfigured = !!process.env.TURNSTILE_SECRET;
        if (turnstileConfigured) {
          if (!captchaToken) throw new CaptchaFailedError();
          const captchaOk = await verifyCaptcha(captchaToken, ip);
          if (!captchaOk) throw new CaptchaFailedError();
        }

        // Hỗ trợ đăng nhập bằng email hoặc SĐT
        const isPhone = /^(0|\+84)[3-9]\d{8}$/.test(email);
        const userSelect = {
          id: true, email: true, fullName: true, passwordHash: true,
          role: true, status: true, sellerStatus: true,
          failedLoginCount: true, lockedUntil: true, twoFactorEnabled: true,
          isAffiliate: true, affiliateStatus: true, referrerAffiliateId: true,
        };
        const user = await (isPhone
          ? prisma.user.findFirst({ where: { phone: email }, select: userSelect })
          : prisma.user.findUnique({ where: { email }, select: userSelect }));

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
          throw new PasswordResetRequiredError();
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

        // Lifetime affiliate — first-touch link on first login (idempotent, additive, separate from the update above)
        if (!user.referrerAffiliateId) {
          const affRefCookie = readCookie(request?.headers?.get("cookie"), "aff_ref");
          if (affRefCookie) {
            await prisma.$transaction((tx) =>
              linkCustomerToAffiliate(tx, { customerId: user.id, affiliateCodeFromCookie: affRefCookie }),
            ).catch((e: unknown) => logger.error({ err: e, userId: user.id }, "Failed to link affiliate on login"));
          }
        }

        void recordAttempt(true);
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: "Đăng nhập thành công",
            body: "",
            type: "SYSTEM",
          },
        });
        logger.info({ userId: user.id, email: user.email }, "Login successful");

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          fullName: user.fullName,
          role: user.role as Role,
          status: user.status as AccountStatus,
          sellerStatus: user.sellerStatus as SellerStatus,
          requiresTwoFactor: (user.role === "ADMIN" || user.role === "STAFF") && !user.twoFactorEnabled,
          isAffiliate: user.isAffiliate,
          affiliateStatus: user.affiliateStatus as AffiliateStatus,
        };
      },
    }),
  ],
});
