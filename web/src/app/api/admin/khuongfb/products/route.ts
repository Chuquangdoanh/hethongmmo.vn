import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { StoreType } from "@prisma/client";
import { z } from "zod";
import { apiOk, apiList, apiCatch, apiValidationError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/security/audit";
import { getEffectiveStock } from "@/lib/khuongfb/types";

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
    const providerFilter  = req.nextUrl.searchParams.get("provider");
    const kfbCategory     = req.nextUrl.searchParams.get("kfbCategory");
    const categoriesOnly  = req.nextUrl.searchParams.get("categoriesOnly") === "1";
    const onlyEnabled     = req.nextUrl.searchParams.get("enabled") === "1";

    // Return distinct externalCategory list for filter UI
    if (categoriesOnly) {
      const cats = await prisma.externalProduct.findMany({
        select:   { externalCategory: true },
        distinct: ["externalCategory"],
        orderBy:  { externalCategory: "asc" },
      });
      return apiOk(cats.map((c) => c.externalCategory));
    }

    const where = {
      ...(validSection   ? { displaySection: validSection }     : {}),
      ...(providerFilter ? { provider: providerFilter }         : {}),
      ...(kfbCategory    ? { externalCategory: kfbCategory }    : {}),
      ...(onlyEnabled    ? { isEnabled: true }                  : {}),
    };

    const [raw, total] = await Promise.all([
      prisma.externalProduct.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ isEnabled: "desc" }, { externalCategory: "asc" }],
        select: {
          id:                  true,
          provider:            true,
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
          rawData:             true,
          stockOverride:       true,
        },
      }),
      prisma.externalProduct.count({ where }),
    ]);

    const data = raw.map((p) => {
      const stockAmount = getEffectiveStock(p.rawData, p.stockOverride);
      const { rawData: _rawData, ...rest } = p;
      return { ...rest, stockAmount };
    });

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
  externalCategory:   z.string().min(1).max(200).trim().optional(),
  stockOverride:      z.number().int().min(0).nullable().optional(),
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

    const before = await prisma.externalProduct.findUnique({
      where:  { id },
      select: { isEnabled: true, salePrice: true, resourceCategoryId: true, subCategoryId: true, displaySection: true },
    });

    const updated = await prisma.externalProduct.update({
      where:  { id },
      data:   parsed.data,
      select: { id: true, name: true, isEnabled: true, salePrice: true, resourceCategoryId: true, subCategoryId: true, displaySection: true },
    });

    await writeAuditLog({
      actorId:    me.id,
      action:     "UPDATE_KHUONGFB_PRODUCT",
      targetType: "ExternalProduct",
      targetId:   id,
      before:     before ?? undefined,
      after:      parsed.data,
    });

    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
