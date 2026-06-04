import { prisma } from "@/lib/db/prisma";
import type { Role } from "@prisma/client";
import { getAllPageKeys, PAGE_REGISTRY } from "@/lib/page-registry";
import type { RolePageGroup } from "@/lib/page-registry";

const REDIS_KEY = (role: string) => `page_perm:disabled:${role}`;

// Returns map { pageKey: boolean } for every known page of that role.
// ADMIN always gets all-true (no restrictions).
export async function getPermissionsForRole(
  role: Role,
): Promise<Record<string, boolean>> {
  if (role === "ADMIN") {
    return Object.fromEntries(getAllPageKeys("STAFF").map((k) => [k, true]));
  }

  const roleKey = role as RolePageGroup;
  if (!PAGE_REGISTRY[roleKey]) return {};

  const allKeys = getAllPageKeys(roleKey);
  const records = await prisma.pagePermission.findMany({ where: { role } });
  const recordMap = Object.fromEntries(records.map((r) => [r.pageKey, r.isEnabled]));

  return Object.fromEntries(allKeys.map((key) => [key, recordMap[key] ?? true]));
}

// Returns page keys that are disabled for a role (fast DB query for layouts).
export async function getDisabledPageKeys(role: Role): Promise<string[]> {
  if (role === "ADMIN") return [];
  const records = await prisma.pagePermission.findMany({
    where: { role, isEnabled: false },
    select: { pageKey: true },
  });
  return records.map((r) => r.pageKey);
}

// Saves the full permission map for a role and syncs Redis.
export async function savePermissions(
  role: Role,
  permissions: Record<string, boolean>,
  actorId: string,
): Promise<void> {
  // Upsert each page permission in a single transaction
  await prisma.$transaction(
    Object.entries(permissions).map(([pageKey, isEnabled]) =>
      prisma.pagePermission.upsert({
        where:  { role_pageKey: { role, pageKey } },
        create: { role, pageKey, isEnabled, updatedByUserId: actorId },
        update: { isEnabled, updatedByUserId: actorId },
      }),
    ),
  );

  await syncToRedis(role);
}

async function syncToRedis(role: Role): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });

    const disabledRecords = await prisma.pagePermission.findMany({
      where: { role, isEnabled: false },
      select: { pageKey: true },
    });
    const disabledKeys = disabledRecords.map((r) => r.pageKey);

    if (disabledKeys.length === 0) {
      await redis.del(REDIS_KEY(role));
    } else {
      // TTL 1h — refreshed on every save
      await redis.set(REDIS_KEY(role), JSON.stringify(disabledKeys), { ex: 3600 });
    }
  } catch { /* fail-open: Redis unavailable won't break saving */ }
}
