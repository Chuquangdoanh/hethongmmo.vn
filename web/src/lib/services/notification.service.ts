import { prisma } from "@/lib/db/prisma";
import type { NotificationType, Notification } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";

interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  meta?: Prisma.InputJsonObject;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<Notification> {
  const { userId, title, body, type = "SYSTEM", meta } = params;
  return prisma.notification.create({
    data: { userId, title, body, type, meta: meta ?? undefined },
  });
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  if (result.count === 0) throw new NotFoundError("Notification");
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string, excludeSystem = false): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
      ...(excludeSystem ? { NOT: { type: "SYSTEM" } } : {}),
    },
  });
}

export async function getUserNotifications(
  userId: string,
  page = 1,
  limit = 20,
  excludeSystem = false,
): Promise<{ data: Notification[]; total: number }> {
  const skip = (page - 1) * limit;
  const where = {
    userId,
    ...(excludeSystem ? { NOT: { type: "SYSTEM" as const } } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.notification.count({ where }),
  ]);
  return { data, total };
}
