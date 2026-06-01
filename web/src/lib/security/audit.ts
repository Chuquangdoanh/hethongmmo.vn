import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

interface AuditParams {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
  metadata?: Prisma.InputJsonObject;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
