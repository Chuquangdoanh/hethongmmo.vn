/**
 * Seed dữ liệu modules + permissions vào DB.
 * Chạy: pnpm tsx scripts/seed-permissions.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { MODULES, PERMISSIONS } from "../src/lib/constants/modules";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding modules and permissions...\n");

  // 1. Upsert modules
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: {
        label:       mod.label,
        icon:        mod.icon ?? null,
        description: mod.description ?? null,
        sortOrder:   mod.sortOrder,
      },
      create: {
        code:        mod.code,
        label:       mod.label,
        icon:        mod.icon ?? null,
        description: mod.description ?? null,
        sortOrder:   mod.sortOrder,
      },
    });
    console.log(`  ✓ module: ${mod.code}`);
  }

  console.log(`\n✅ ${MODULES.length} modules seeded\n`);

  // 2. Upsert permissions
  for (const perm of PERMISSIONS) {
    const module = await prisma.module.findUnique({ where: { code: perm.module } });
    if (!module) {
      console.warn(`  ⚠️  module not found: ${perm.module} (skip ${perm.code})`);
      continue;
    }

    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        label:       perm.label,
        action:      perm.action,
        description: perm.description ?? null,
        sortOrder:   perm.sortOrder,
        moduleId:    module.id,
      },
      create: {
        code:        perm.code,
        moduleId:    module.id,
        label:       perm.label,
        action:      perm.action,
        description: perm.description ?? null,
        sortOrder:   perm.sortOrder,
      },
    });
    console.log(`  ✓ permission: ${perm.code}`);
  }

  console.log(`\n✅ ${PERMISSIONS.length} permissions seeded`);
  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
