import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { processDeposit } from "@/lib/services/deposit.service";
import { DuplicateError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

const sePaySchema = z.object({
  id: z.number(),
  gateway: z.string(),
  transactionDate: z.string(),
  accountNumber: z.string().optional(),
  subAccount: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  content: z.string(),
  transferType: z.string(),
  transferAmount: z.number(),
  accumulated: z.number().optional(),
  referenceCode: z.string(),
  description: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Read raw body BEFORE anything else
  const rawBody = await req.text();

  // 2. Verify HMAC signature (skip if no secret configured)
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (secret) {
    const signature =
      req.headers.get("x-sepay-signature") ??
      req.headers.get("X-SePay-Signature") ??
      "";
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    let valid = false;
    try {
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (sigBuf.length === expBuf.length) {
        valid = timingSafeEqual(sigBuf, expBuf);
      }
    } catch {
      valid = false;
    }
    if (!valid) {
      logger.warn({ signature: signature.slice(0, 8) + "..." }, "SePay HMAC mismatch");
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 200 });
    }
  }

  // 3. Parse + Zod validate
  let payload: z.infer<typeof sePaySchema>;
  try {
    payload = sePaySchema.parse(JSON.parse(rawBody));
  } catch (err) {
    logger.warn({ err }, "SePay payload validation failed");
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 200 });
  }

  // 4. Only process incoming transfers >= 10,000đ
  if (payload.transferType !== "in" || payload.transferAmount < 10_000) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const { referenceCode, transferAmount, content, gateway, transactionDate } = payload;

  // 5. Find uid_prefix (8 lowercase hex chars) in transfer content
  const uidMatch = content.match(/\b([0-9a-fA-F]{8})\b/);
  const uidPrefix = uidMatch?.[1]?.toLowerCase();

  if (!uidPrefix) {
    await saveUnmatched(referenceCode, transferAmount, content, payload as Prisma.InputJsonObject);
    logger.info({ referenceCode, content: content.slice(0, 60) }, "SePay: no uid_prefix in content");
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // 6. Match user by uid_prefix
  const user = await prisma.user.findFirst({
    where: { uidPrefix, status: "ACTIVE", deletedAt: null },
    select: { id: true, email: true },
  });

  if (!user) {
    await saveUnmatched(referenceCode, transferAmount, content, payload as Prisma.InputJsonObject, [uidPrefix]);
    logger.info({ referenceCode, uidPrefix }, "SePay: uid_prefix not matched to any user");
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // 7. Process deposit (idempotent)
  try {
    await processDeposit({
      userId: user.id,
      amount: transferAmount,
      referenceCode,
      description: `Nạp tiền qua ${gateway}: ${content.slice(0, 200)}`,
      type: "DEPOSIT_AUTO",
      metadata: {
        gateway,
        content: content.slice(0, 500),
        transactionDate,
        sePayId: String(payload.id),
      },
    });

    // 8. Create ticker notification (non-critical, fire-and-forget)
    const maskedEmail = user.email.slice(0, 3) + "***@" + user.email.split("@")[1];
    prisma.tickerNotification
      .create({
        data: {
          phone: maskedEmail,
          amount: transferAmount,
          isActive: true,
        },
      })
      .catch(() => {});

    logger.info({ userId: user.id, amount: transferAmount, referenceCode }, "SePay deposit processed");
  } catch (err) {
    if (err instanceof DuplicateError) {
      logger.info({ referenceCode }, "SePay duplicate webhook — skipping");
    } else {
      logger.error({ err, referenceCode, userId: user.id }, "SePay deposit processing error");
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

async function saveUnmatched(
  referenceCode: string,
  amount: number,
  content: string,
  rawPayload: Prisma.InputJsonObject,
  candidatesTried: string[] = [],
): Promise<void> {
  try {
    await prisma.unmatchedTransfer.upsert({
      where: { referenceCode },
      create: { referenceCode, amount, content, rawPayload, candidatesTried },
      update: {},
    });
  } catch {
    // Already stored — idempotent
  }
}
