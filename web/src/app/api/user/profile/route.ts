import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/rbac";
import { encrypt } from "@/lib/security/encryption";
import { updateProfileSchema } from "@/lib/validation/user.schema";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

type SocialRow = { facebook_url: string | null; telegram_username: string | null };

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const [user, socialRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: me.id, deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          sellerStatus: true,
          sellerCategory: true,
          balance: true,
          totalDeposited: true,
          totalSpent: true,
          uidPrefix: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          bankNameEnc: true,
          bankAccountNumberEnc: true,
          bankAccountHolderEnc: true,
        },
      }),
      prisma.$queryRaw<SocialRow[]>`
        SELECT facebook_url, telegram_username FROM users WHERE id = ${me.id}
      `,
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { bankNameEnc, bankAccountNumberEnc, bankAccountHolderEnc, ...safe } = user;
    const social = socialRows[0];

    return NextResponse.json({
      data: {
        ...safe,
        hasBankInfo: !!(bankNameEnc && bankAccountNumberEnc && bankAccountHolderEnc),
        facebookUrl: social?.facebook_url ?? null,
        telegramUsername: social?.telegram_username ?? null,
      },
    });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireUser(session);

    const body: unknown = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const {
      fullName, phone,
      bankName, bankAccountNumber, bankAccountHolder,
      cccdImageUrl, portraitImageUrl,
      facebookUrl, telegramUsername,
    } = parsed.data;

    const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (bankName !== undefined) updateData.bankNameEnc = encrypt(bankName) as unknown as Uint8Array<ArrayBuffer>;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumberEnc = encrypt(bankAccountNumber) as unknown as Uint8Array<ArrayBuffer>;
    if (bankAccountHolder !== undefined) updateData.bankAccountHolderEnc = encrypt(bankAccountHolder) as unknown as Uint8Array<ArrayBuffer>;
    if (cccdImageUrl !== undefined) updateData.cccdImageUrl = cccdImageUrl;
    if (portraitImageUrl !== undefined) updateData.portraitImageUrl = portraitImageUrl;

    const hasSocial = facebookUrl !== undefined || telegramUsername !== undefined;
    if (Object.keys(updateData).length === 0 && !hasSocial) {
      return NextResponse.json({ error: "Không có dữ liệu để cập nhật", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const ops: Promise<unknown>[] = [];
    if (Object.keys(updateData).length > 0) {
      ops.push(prisma.user.update({ where: { id: me.id }, data: updateData }));
    }
    // Use raw SQL for new fields to avoid Prisma DMMF cache issues in dev
    if (facebookUrl !== undefined) {
      const val = facebookUrl || null;
      ops.push(prisma.$executeRaw`UPDATE users SET facebook_url = ${val} WHERE id = ${me.id}`);
    }
    if (telegramUsername !== undefined) {
      const val = telegramUsername || null;
      ops.push(prisma.$executeRaw`UPDATE users SET telegram_username = ${val} WHERE id = ${me.id}`);
    }
    await Promise.all(ops);

    return NextResponse.json({ success: true, message: "Cập nhật thành công" });
  } catch (err) {
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
