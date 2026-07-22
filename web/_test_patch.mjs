import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Simulate PATCH: set stockOverride + externalCategory on 1 VNCloud product
const target = await prisma.externalProduct.findFirst({ where: { provider: "chudoanhofficial-gmail-com" } });
await prisma.externalProduct.update({
  where: { id: target.id },
  data: { stockOverride: 15, externalCategory: "VPS Cloud (custom)" },
});
console.log("Patched OK");

// Simulate a sync run afterwards to confirm these are NOT overwritten
const after = await prisma.externalProduct.findUnique({ where: { id: target.id }, select: { stockOverride: true, externalCategory: true } });
console.log("Before sync:", after);

await prisma.$disconnect();
await pool.end();
