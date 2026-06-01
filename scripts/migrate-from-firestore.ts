#!/usr/bin/env tsx
/**
 * Firestore → PostgreSQL migration script.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-from-firestore.ts
 *   pnpm tsx scripts/migrate-from-firestore.ts --dry-run
 *   pnpm tsx scripts/migrate-from-firestore.ts --collection=users --batch=100
 *   pnpm tsx scripts/migrate-from-firestore.ts --resume
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const RESUME = args.includes("--resume");

function getArg(name: string): string | undefined {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split("=")[1] : undefined;
}

const ONLY_COLLECTION = getArg("collection");
const BATCH_SIZE = Number(getArg("batch") ?? "500");

// ── Checkpoint ────────────────────────────────────────────────────────────────

const CHECKPOINT_FILE = path.resolve(process.cwd(), ".migration-checkpoint.json");
const ERROR_LOG = path.resolve(process.cwd(), "migration-errors.log");

interface Checkpoint {
  [collection: string]: {
    lastId: string | null;
    processed: number;
    errors: number;
  };
}

function loadCheckpoint(): Checkpoint {
  if (RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8")) as Checkpoint;
    } catch {
      return {};
    }
  }
  return {};
}

function saveCheckpoint(cp: Checkpoint): void {
  if (!DRY_RUN) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
  }
}

function logError(collection: string, docId: string, error: unknown): void {
  const line =
    JSON.stringify({ ts: new Date().toISOString(), collection, docId, error: String(error) }) +
    "\n";
  fs.appendFileSync(ERROR_LOG, line);
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function renderProgress(label: string, done: number, total: number): void {
  if (!process.stdout.isTTY) {
    console.log(`[${label}] ${done}/${total}`);
    return;
  }
  const width = 40;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const filled = Math.round(width * pct);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`[${label}] [${bar}] ${done}/${total} (${Math.round(pct * 100)}%)`);
}

function finishProgress(label: string, done: number, errors: number): void {
  if (process.stdout.isTTY) process.stdout.write("\n");
  console.log(`✓ [${label}] done: ${done} records, errors: ${errors}`);
}

// ── Lazy Firestore + Prisma imports ──────────────────────────────────────────

async function loadFirestore() {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (!serviceAccountPath) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY_PATH env var is required for migration",
      );
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

async function loadPrisma() {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ log: ["warn", "error"] });
}

// ── Collection migrators ──────────────────────────────────────────────────────

async function migrateUsers(
  db: Awaited<ReturnType<typeof loadFirestore>>,
  prisma: Awaited<ReturnType<typeof loadPrisma>>,
  cp: Checkpoint,
): Promise<void> {
  const state = cp["users"] ?? { lastId: null, processed: 0, errors: 0 };
  const collection = "users";

  let query = db.collection(collection).orderBy("__name__").limit(BATCH_SIZE);
  if (state.lastId) query = query.startAfter(state.lastId);

  const totalSnap = await db.collection(collection).count().get();
  const total = totalSnap.data().count;

  while (true) {
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = doc.data() as Record<string, any>;
      const docId = doc.id;

      try {
        if (!DRY_RUN) {
          // Users migrated from Firebase Auth have no argon2id hash yet.
          // Set sentinel so login flow forces password reset.
          const passwordHash =
            typeof data.passwordHash === "string" && data.passwordHash.startsWith("$argon2")
              ? data.passwordHash
              : "$RESET_REQUIRED$";

          const uidPrefix = docId.replace(/-/g, "").slice(0, 8);

          await prisma.user.upsert({
            where: { email: data.email as string },
            create: {
              id: docId,
              email: data.email as string,
              fullName: (data.fullName ?? data.displayName ?? "") as string,
              phone: data.phone as string | undefined,
              passwordHash,
              role: (data.role ?? "USER") as never,
              status: (data.status ?? "ACTIVE") as never,
              balance: String(data.balance ?? "0"),
              totalDeposited: String(data.totalDeposited ?? "0"),
              totalSpent: String(data.totalSpent ?? "0"),
              uidPrefix,
              emailVerifiedAt: data.emailVerifiedAt
                ? new Date(data.emailVerifiedAt._seconds * 1000)
                : null,
              createdAt: data.createdAt
                ? new Date(data.createdAt._seconds * 1000)
                : new Date(),
            },
            update: {
              fullName: (data.fullName ?? data.displayName ?? "") as string,
              phone: data.phone as string | undefined,
              role: (data.role ?? "USER") as never,
              status: (data.status ?? "ACTIVE") as never,
            },
          });
        } else {
          console.log(`[dry-run][users] would upsert user ${docId} (${data.email})`);
        }
        state.processed++;
      } catch (err) {
        state.errors++;
        logError(collection, docId, err);
      }

      renderProgress("users", state.processed, total);
    }

    state.lastId = snap.docs[snap.docs.length - 1]?.id ?? null;
    cp[collection] = state;
    saveCheckpoint(cp);

    if (snap.size < BATCH_SIZE) break;
    query = db.collection(collection).orderBy("__name__").limit(BATCH_SIZE).startAfter(state.lastId);
  }

  finishProgress("users", state.processed, state.errors);
}

async function migrateTransactions(
  db: Awaited<ReturnType<typeof loadFirestore>>,
  prisma: Awaited<ReturnType<typeof loadPrisma>>,
  cp: Checkpoint,
): Promise<void> {
  const state = cp["transactions"] ?? { lastId: null, processed: 0, errors: 0 };
  const collection = "transactions";

  let query = db.collection(collection).orderBy("__name__").limit(BATCH_SIZE);
  if (state.lastId) query = query.startAfter(state.lastId);

  const totalSnap = await db.collection(collection).count().get();
  const total = totalSnap.data().count;

  const TX_TYPE_MAP: Record<string, string> = {
    deposit: "DEPOSIT_MANUAL",
    deposit_auto: "DEPOSIT_AUTO",
    purchase: "BUY_SERVICE",
    buy_service: "BUY_SERVICE",
    buy_course: "BUY_COURSE",
    buy_mmo: "BUY_MMO_PRODUCT",
    refund: "REFUND",
    admin_adjustment: "ADMIN_ADJUSTMENT",
  };

  while (true) {
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = doc.data() as Record<string, any>;
      const docId = doc.id;

      try {
        if (!DRY_RUN) {
          const txType = TX_TYPE_MAP[String(data.type ?? "").toLowerCase()] ?? "ADMIN_ADJUSTMENT";

          await prisma.transaction.upsert({
            where: { referenceCode: docId },
            create: {
              id: docId,
              userId: data.userId as string,
              type: txType as never,
              amount: String(data.amount ?? "0"),
              description: (data.description ?? "") as string,
              balanceBefore: String(data.balanceBefore ?? "0"),
              balanceAfter: String(data.balanceAfter ?? data.balance ?? "0"),
              referenceCode: docId,
              createdAt: data.createdAt
                ? new Date(data.createdAt._seconds * 1000)
                : new Date(),
            },
            update: {},
          });
        } else {
          console.log(`[dry-run][transactions] would upsert tx ${docId}`);
        }
        state.processed++;
      } catch (err) {
        state.errors++;
        logError(collection, docId, err);
      }

      renderProgress("transactions", state.processed, total);
    }

    state.lastId = snap.docs[snap.docs.length - 1]?.id ?? null;
    cp[collection] = state;
    saveCheckpoint(cp);

    if (snap.size < BATCH_SIZE) break;
    query = db
      .collection(collection)
      .orderBy("__name__")
      .limit(BATCH_SIZE)
      .startAfter(state.lastId);
  }

  finishProgress("transactions", state.processed, state.errors);
}

async function migrateOrders(
  db: Awaited<ReturnType<typeof loadFirestore>>,
  prisma: Awaited<ReturnType<typeof loadPrisma>>,
  cp: Checkpoint,
): Promise<void> {
  const state = cp["orders"] ?? { lastId: null, processed: 0, errors: 0 };
  const collection = "orders";

  let query = db.collection(collection).orderBy("__name__").limit(BATCH_SIZE);
  if (state.lastId) query = query.startAfter(state.lastId);

  const totalSnap = await db.collection(collection).count().get();
  const total = totalSnap.data().count;

  const ORDER_TYPE_MAP: Record<string, string> = {
    service: "SERVICE",
    course: "COURSE",
    tut_trick: "TUTTRICK",
    tuttrick: "TUTTRICK",
    mmo_product: "MMO_PRODUCT",
    seller_product: "SELLER_PRODUCT",
  };

  const STATUS_MAP: Record<string, string> = {
    pending: "PENDING",
    processing: "PROCESSING",
    done: "DONE",
    completed: "DONE",
    cancelled: "CANCELLED",
    canceled: "CANCELLED",
    refunded: "REFUNDED",
    disputed: "DISPUTED",
  };

  while (true) {
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = doc.data() as Record<string, any>;
      const docId = doc.id;

      try {
        if (!DRY_RUN) {
          const orderType =
            ORDER_TYPE_MAP[String(data.orderType ?? "").toLowerCase()] ?? "SERVICE";
          const status = STATUS_MAP[String(data.status ?? "").toLowerCase()] ?? "DONE";
          const orderCode = (data.orderCode ?? `MIGRATED-${docId.slice(0, 8)}`) as string;

          await prisma.order.upsert({
            where: { orderCode },
            create: {
              id: docId,
              orderCode,
              userId: data.userId as string,
              orderType: orderType as never,
              itemName: (data.itemName ?? "Sản phẩm đã mua") as string,
              originalPrice: String(data.price ?? data.amount ?? "0"),
              finalPrice: String(data.finalPrice ?? data.price ?? data.amount ?? "0"),
              status: status as never,
              createdAt: data.createdAt
                ? new Date(data.createdAt._seconds * 1000)
                : new Date(),
              completedAt:
                status === "DONE" && data.completedAt
                  ? new Date(data.completedAt._seconds * 1000)
                  : null,
            },
            update: {},
          });
        } else {
          console.log(`[dry-run][orders] would upsert order ${docId}`);
        }
        state.processed++;
      } catch (err) {
        state.errors++;
        logError(collection, docId, err);
      }

      renderProgress("orders", state.processed, total);
    }

    state.lastId = snap.docs[snap.docs.length - 1]?.id ?? null;
    cp[collection] = state;
    saveCheckpoint(cp);

    if (snap.size < BATCH_SIZE) break;
    query = db
      .collection(collection)
      .orderBy("__name__")
      .limit(BATCH_SIZE)
      .startAfter(state.lastId);
  }

  finishProgress("orders", state.processed, state.errors);
}

async function migrateNotifications(
  db: Awaited<ReturnType<typeof loadFirestore>>,
  prisma: Awaited<ReturnType<typeof loadPrisma>>,
  cp: Checkpoint,
): Promise<void> {
  const state = cp["notifications"] ?? { lastId: null, processed: 0, errors: 0 };
  const collection = "notifications";

  let query = db.collection(collection).orderBy("__name__").limit(BATCH_SIZE);
  if (state.lastId) query = query.startAfter(state.lastId);

  const totalSnap = await db.collection(collection).count().get();
  const total = totalSnap.data().count;

  const NOTIF_TYPE_MAP: Record<string, string> = {
    deposit: "DEPOSIT",
    purchase: "PURCHASE",
    order_status: "ORDER_STATUS",
    seller_approved: "SELLER_APPROVED",
    withdrawal: "WITHDRAWAL_STATUS",
    withdrawal_status: "WITHDRAWAL_STATUS",
    system: "SYSTEM",
    promotion: "PROMOTION",
  };

  while (true) {
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = doc.data() as Record<string, any>;
      const docId = doc.id;

      try {
        if (!DRY_RUN) {
          const type = NOTIF_TYPE_MAP[String(data.type ?? "").toLowerCase()] ?? "SYSTEM";

          await prisma.notification.upsert({
            where: { id: docId },
            create: {
              id: docId,
              userId: data.userId as string,
              title: (data.title ?? "Thông báo") as string,
              body: (data.body ?? data.message ?? "") as string,
              type: type as never,
              isRead: Boolean(data.isRead ?? data.read ?? false),
              createdAt: data.createdAt
                ? new Date(data.createdAt._seconds * 1000)
                : new Date(),
            },
            update: {},
          });
        } else {
          console.log(`[dry-run][notifications] would upsert ${docId}`);
        }
        state.processed++;
      } catch (err) {
        state.errors++;
        logError(collection, docId, err);
      }

      renderProgress("notifications", state.processed, total);
    }

    state.lastId = snap.docs[snap.docs.length - 1]?.id ?? null;
    cp[collection] = state;
    saveCheckpoint(cp);

    if (snap.size < BATCH_SIZE) break;
    query = db
      .collection(collection)
      .orderBy("__name__")
      .limit(BATCH_SIZE)
      .startAfter(state.lastId);
  }

  finishProgress("notifications", state.processed, state.errors);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ALL_COLLECTIONS = ["users", "transactions", "orders", "notifications"];

const MIGRATORS: Record<
  string,
  (
    db: Awaited<ReturnType<typeof loadFirestore>>,
    prisma: Awaited<ReturnType<typeof loadPrisma>>,
    cp: Checkpoint,
  ) => Promise<void>
> = {
  users: migrateUsers,
  transactions: migrateTransactions,
  orders: migrateOrders,
  notifications: migrateNotifications,
};

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Firestore → PostgreSQL migration");
  if (DRY_RUN) console.log("MODE: DRY RUN — no data will be written");
  if (RESUME) console.log("MODE: RESUME — continuing from checkpoint");
  console.log("=".repeat(60));

  const db = await loadFirestore();
  const prisma = await loadPrisma();
  const cp = loadCheckpoint();

  const collections = ONLY_COLLECTION ? [ONLY_COLLECTION] : ALL_COLLECTIONS;

  for (const col of collections) {
    const migrator = MIGRATORS[col];
    if (!migrator) {
      console.warn(`[warn] unknown collection: ${col} — skipping`);
      continue;
    }
    console.log(`\n→ Migrating: ${col}`);
    await migrator(db, prisma, cp);
  }

  await prisma.$disconnect();

  if (!DRY_RUN && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log("\n✓ Checkpoint file removed (migration complete)");
  }

  const totalErrors = Object.values(cp).reduce((sum, s) => sum + s.errors, 0);
  if (totalErrors > 0) {
    console.log(`\n⚠  ${totalErrors} error(s) logged to: ${ERROR_LOG}`);
    process.exit(1);
  } else {
    console.log("\n✓ Migration completed successfully");
  }
}

main().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
