import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { AppAuthError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { toApiError, DuplicateError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/security/audit";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["USER", "SELLER", "STAFF", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "BANNED", "DELETED"]).optional(),
  sellerStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED", "REVOKED"]).optional(),
});

const adminCreateUserSchema = z.object({
  email:    z.string().email("Email không hợp lệ").toLowerCase().trim(),
  fullName: z.string().min(2, "Tên tối thiểu 2 ký tự").max(100).trim(),
  phone:    z.string().regex(/^(0|\+84)[3-9]\d{8}$/, "Số điện thoại không hợp lệ")
              .optional().or(z.literal("").transform(() => undefined)),
  password: z.string()
              .min(8, "Mật khẩu tối thiểu 8 ký tự")
              .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa (A-Z)")
              .regex(/[a-z]/, "Cần ít nhất 1 chữ thường (a-z)")
              .regex(/[0-9]/, "Cần ít nhất 1 chữ số (0-9)"),
  role:     z.enum(["USER", "SELLER", "STAFF", "ADMIN"]).default("USER"),
  status:   z.enum(["ACTIVE", "PENDING_VERIFICATION"]).default("ACTIVE"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const body: unknown = await req.json();
    const parsed = adminCreateUserSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const { email, fullName, phone, password, role, status } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new DuplicateError("Email", email);

    const passwordHash = await hashPassword(password);
    const id = randomUUID();
    const uidPrefix = id.replace(/-/g, "").slice(0, 8);

    const user = await prisma.user.create({
      data: {
        id,
        uidPrefix,
        email,
        fullName,
        phone: phone ?? null,
        passwordHash,
        role: role as never,
        status: status as never,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, createdAt: true,
      },
    });

    await writeAuditLog({
      actorId: me.id,
      action: "ADMIN_CREATE_USER",
      targetType: "User",
      targetId: user.id,
      after: { email, fullName, role, status },
    });

    return apiOk(user, 201);
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return apiCatch(err);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = req.nextUrl;
    const query = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!query.success) {
      return NextResponse.json({ error: "Tham số không hợp lệ", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { page, limit, search, role, status, sellerStatus } = query.data;
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { fullName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(sellerStatus ? { sellerStatus } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          sellerStatus: true,
          balance: true,
          totalDeposited: true,
          totalSpent: true,
          uidPrefix: true,
          lastLoginAt: true,
          createdAt: true,
          // Never return sensitive fields
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    if (err instanceof AppAuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const e = toApiError(err);
    return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
  }
}
