import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { StoreType } from "@prisma/client";
import { z } from "zod";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    requireAdmin(session);

    const page    = Math.max(1, Number(req.nextUrl.searchParams.get("page")  ?? 1));
    const limit   = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));
    const section = req.nextUrl.searchParams.get("section");
    const validSection: StoreType | undefined =
      section === "TAI_NGUYEN_MMO" || section === "KHO_TAI_NGUYEN"
        ? (section as StoreType)
        : undefined;
    const where = validSection ? { displaySection: validSection } : {};

    const [data, total] = await Promise.all([
      prisma.khuongfbProduct.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ isEnabled: "desc" }, { externalCategory: "asc" }],
        select: {
          id:                  true,
          externalId:          true,
          externalCategory:    true,
          name:                true,
          description:         true,
          originalPrice:       true,
          salePrice:           true,
          isEnabled:           true,
          warrantyInfo:        true,
          displaySection:      true,
          thumbnail:           true,
          resourceCategoryId:  true,
          resourceCategory:    { select: { id: true, name: true } },
          subCategoryId:       true,
          subCategory:         { select: { id: true, name: true } },
          syncedAt:            true,
        },
      }),
      prisma.khuongfbProduct.count({ where }),
    ]);

    return apiList(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return apiCatch(err);
  }
}

const patchSchema = z.object({
  isEnabled:          z.boolean().optional(),
  name:               z.string().min(1).max(500).trim().optional(),
  description:        z.string().max(10000).nullable().optional(),
  salePrice:          z.number().positive().optional(),
  resourceCategoryId: z.string().uuid().nullable().optional(),
  subCategoryId:      z.string().uuid().nullable().optional(),
  displaySection:     z.enum(["TAI_NGUYEN_MMO", "KHO_TAI_NGUYEN"]).optional(),
  thumbnail:          z.string().url().nullable().optional(),
  warrantyInfo:       z.string().max(5000).nullable().optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const me = requireAdmin(session);

    const url   = new URL(req.url);
    const id    = url.searchParams.get("id");
    if (!id) return apiCatch(new Error("Thiếu param id"));

    const body: unknown = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const before = await prisma.khuongfbProduct.findUnique({
      where:  { id },
      select: { isEnabled: true, salePrice: true, resourceCategoryId: true, subCategoryId: true, displaySection: true },
    });

    const updated = await prisma.khuongfbProduct.update({
      where:  { id },
      data:   parsed.data,
      select: { id: true, name: true, isEnabled: true, salePrice: true, resourceCategoryId: true, subCategoryId: true, displaySection: true },
    });

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_KHUONGFB_PRODUCT",
      targetType: "KhuongfbProduct",
      targetId:   id,
      before:     before ?? undefined,
      after:      parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
