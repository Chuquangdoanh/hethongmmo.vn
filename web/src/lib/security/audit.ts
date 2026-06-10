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

const AUDIT_RETENTION_DAYS = 90;

export async function writeAuditLog(params: AuditParams): Promise<void> {
  if (params.actorId) {
    const user = await prisma.user.findUnique({
      where: { id: params.actorId },
      select: { role: true },
    });
    if (!user || user.role === "USER" || user.role === "SELLER") return;
  }

  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.auditLog.create({
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
    }),
    // Purge records older than retention window
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
}
