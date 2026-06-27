import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // DB_POOL_SIZE: số connections mỗi worker process
  // Với clustering: tổng = CLUSTER_WORKERS × DB_POOL_SIZE → vào PgBouncer → 25 connections thực đến PostgreSQL
  // Default 10: 2 workers × 10 = 20 (bằng pool cũ), 4 workers × 10 = 40 (PgBouncer handle)
  const max = parseInt(process.env.DB_POOL_SIZE ?? "10", 10);
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const adapter = new PrismaPg(pool);

  // Pre-warm 1 connection ngay khi module load — tránh cold-connect 300-700ms
  // ở request đầu tiên của user. Fire-and-forget, không block startup.
  pool.query("SELECT 1").catch(() => undefined);

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
