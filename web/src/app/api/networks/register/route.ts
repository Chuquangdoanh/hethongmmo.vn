import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiCatch, apiValidationError } from "@/lib/api-response";

export const runtime = "nodejs";

const registerSchema = z.object({
  name:        z.string().min(2).max(100).trim(),
  phone:       z.string().min(8).max(20).trim(),
  serviceType: z.enum(["MUA_PAGE", "CAP_PAGE"]),
  serviceName: z.string().min(1).max(200).trim(),
  description: z.string().min(5).max(1000).trim(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.issues);

    const reg = await prisma.fanpageRegistration.create({
      data: {
        name:        parsed.data.name,
        phone:       parsed.data.phone,
        serviceType: parsed.data.serviceType,
        serviceName: parsed.data.serviceName,
        description: parsed.data.description,
      },
      select: { id: true, createdAt: true },
    });

    return apiOk({ id: reg.id, createdAt: reg.createdAt });
  } catch (err) {
    return apiCatch(err);
  }
}
