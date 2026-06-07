import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const registerSchema = z.object({
  name:            z.string().min(2).max(100).trim(),
  phone:           z.string().min(8).max(20).trim(),
  serviceName:     z.string().min(1).max(200).trim(),
  serviceTab:      z.enum(["facebook", "tiktok"]),
  fanpageStatus:   z.enum(["none", "has"]),
  hasContent:      z.enum(["none", "has"]),
  adsExperience:   z.enum(["never", "has"]),
  productCategory: z.string().min(1).max(200).trim(),
  budget:          z.enum(["10-50m", "50-100m", "100-300m", "300-500m", "tren-500tr"]),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const reg = await prisma.adsRegistration.create({
      data: {
        name:            parsed.data.name,
        phone:           parsed.data.phone,
        serviceName:     parsed.data.serviceName,
        serviceTab:      parsed.data.serviceTab,
        fanpageStatus:   parsed.data.fanpageStatus,
        hasContent:      parsed.data.hasContent,
        adsExperience:   parsed.data.adsExperience,
        productCategory: parsed.data.productCategory,
        budget:          parsed.data.budget,
      },
      select: { id: true, createdAt: true },
    });

    return apiOk({ id: reg.id, createdAt: reg.createdAt });
  } catch (err) {
    return apiCatch(err);
  }
}
