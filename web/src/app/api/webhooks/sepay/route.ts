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

  // 1a. IP whitelist — defense-in-depth layer behind HMAC (optional, set SEPAY_IP_WHITELIST)
  const ipWhitelist = process.env.SEPAY_IP_WHITELIST;
  if (ipWhitelist) {
    const allowedIPs = ipWhitelist.split(",").map(ip => ip.trim()).filter(Boolean);
    const clientIP =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn({ clientIP }, "SePay webhook: IP not in whitelist");
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 200 });
    }
  }

  // 2. Verify auth — SePay hỗ trợ 2 mode tùy config trong dashboard:
  //   a) HMAC-SHA256: ký rawBody bằng webhook secret → gửi qua x-sepay-signature
  //   b) Plain Apikey: gửi key trực tiếp qua header Apikey
  // Thử HMAC trước (mode bảo mật hơn), fallback sang Apikey.
  // SEPAY_WEBHOOK_SECRET phải khớp với "Webhook Secret" trong SePay dashboard.
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("SEPAY_WEBHOOK_SECRET is not configured — rejecting all webhook requests");
    return NextResponse.json({ success: false, message: "Webhook not configured" }, { status: 200 });
  }

  let valid = false;

  // Mode A: HMAC-SHA256 (x-sepay-signature header)
  // SePay có thể gửi signature theo các format:
  //   - Hex thuần: "abcdef..."
  //   - Có prefix: "sha256=abcdef..."
  // Secret trong .env có thể có prefix "whsec_" — thử cả 2 variant.
  const rawHmacSig = req.headers.get("x-sepay-signature") ?? req.headers.get("X-SePay-Signature") ?? "";
  const hmacSig = rawHmacSig.startsWith("sha256=") ? rawHmacSig.slice(7) : rawHmacSig;

  let hmacValid = false;
  if (hmacSig) {
    // Thử 3 variant của secret key:
    // 1. Dùng nguyên chuỗi (UTF-8 bytes)
    // 2. Bỏ prefix "whsec_", dùng phần còn lại là chuỗi UTF-8
    // 3. Bỏ prefix "whsec_", base64-decode phần còn lại → raw bytes (Stripe-style)
    const rawPart = secret.startsWith("whsec_") ? secret.slice(6) : null;
    const keyVariants: Array<string | Buffer> = [
      secret,
      ...(rawPart ? [rawPart, Buffer.from(rawPart, "base64")] : []),
    ];
    const sigBuf = Buffer.from(hmacSig, "hex");
    if (sigBuf.length > 0) {
      for (const key of keyVariants) {
        try {
          const expected = createHmac("sha256", key).update(rawBody).digest("hex");
          const expBuf   = Buffer.from(expected, "hex");
          if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
            hmacValid = true;
            break;
          }
        } catch { /* ignore — try next variant */ }
      }
    }
    valid = hmacValid;
  }

  // Mode B: Plain Apikey — SePay gửi qua "Authorization: Apikey <key>"
  // hoặc trực tiếp qua header "Apikey: <key>"
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const apiKeyFromAuth = authHeader.startsWith("Apikey ") ? authHeader.slice(7).trim() : "";
  const apiKey = apiKeyFromAuth || req.headers.get("Apikey") || req.headers.get("apikey") || "";
  let apiKeyValid = false;
  if (!valid && apiKey) {
    // Thử plain compare: apiKey === secret hoặc apiKey === secret.slice(6) nếu có prefix
    const secretVariants = [
      secret,
      ...(secret.startsWith("whsec_") ? [secret.slice(6)] : []),
    ];
    for (const s of secretVariants) {
      try {
        const keyBuf = Buffer.from(apiKey);
        const sBuf   = Buffer.from(s);
        if (keyBuf.length === sBuf.length) {
          if (timingSafeEqual(keyBuf, sBuf)) { apiKeyValid = true; break; }
        }
      } catch { /* ignore */ }
    }
    valid = apiKeyValid;
  }

  // WARN-level debug để chẩn đoán (xóa sau khi xác nhận hoạt động)
  logger.warn({
    rawSigLen: rawHmacSig.length,
    sigLen: hmacSig.length,
    hasSha256Prefix: rawHmacSig.startsWith("sha256="),
    hasWhsecPrefix: secret.startsWith("whsec_"),
    secretLen: secret.length,
    apiKeyLen: apiKey.length,
    authHeader: authHeader.slice(0, 12) || "none",
    bodyLen: rawBody.length,
    hmacValid,
    apiKeyValid,
    valid,
  }, "SePay webhook auth detail");

  if (!valid) {
    logger.warn({ hasHmac: !!hmacSig, hasApiKey: !!apiKey }, "SePay auth mismatch — check SEPAY_WEBHOOK_SECRET in .env");
    return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 200 });
  }

  // 3. Parse + Zod validate
  let parsed: ReturnType<typeof sePaySchema.safeParse>;
  try {
    parsed = sePaySchema.safeParse(JSON.parse(rawBody));
  } catch {
    logger.warn("SePay payload JSON parse failed");
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 200 });
  }
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "SePay payload validation failed");
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 200 });
  }
  const payload = parsed.data;

  // 3a. Timestamp sanity check — reject future-dated transactions (clock manipulation)
  const txDateNorm = payload.transactionDate.includes("T")
    ? payload.transactionDate
    : payload.transactionDate.replace(" ", "T");
  const txDate = new Date(txDateNorm);
  if (!isNaN(txDate.getTime())) {
    const nowMs = Date.now();
    const txMs  = txDate.getTime();
    if (txMs - nowMs > 60_000) {
      logger.warn({ transactionDate: payload.transactionDate }, "SePay webhook: future-dated transaction — rejected");
      return NextResponse.json({ success: true }, { status: 200 });
    }
    if (nowMs - txMs > 30 * 60_000) {
      logger.warn(
        { transactionDate: payload.transactionDate, ageMinutes: Math.round((nowMs - txMs) / 60_000) },
        "SePay webhook: stale transaction — possible delayed SePay notification",
      );
    }
  }

  // 4. Only process incoming transfers >= 10,000đ
  if (payload.transferType !== "in" || payload.transferAmount < 10_000) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const { referenceCode, transferAmount, content, gateway, transactionDate, accountNumber, description } = payload;

  // 5. Find uid_prefix (8 lowercase hex chars) in transfer content
  // Search order: content first, description fallback (some banks put original text in description)
  // Primary regex: "NAP"/"nap"/"nạp" keyword + 8 hex chars (handles Vietnamese diacritics)
  // Fallback: bare 8-hex word boundary — risky if bank ref codes contain 8 hex chars,
  //           only used when no NAP keyword found at all
  const NAP_RE  = /\bn[aạ]p\s*([0-9a-fA-F]{8})\b/i;
  const BARE_RE = /\b([0-9a-fA-F]{8})\b/;
  const searchTargets = [content, description ?? ""].filter(Boolean);

  let uidMatch: RegExpMatchArray | null = null;
  for (const src of searchTargets) {
    uidMatch = src.match(NAP_RE);
    if (uidMatch) break;
  }
  if (!uidMatch) {
    for (const src of searchTargets) {
      uidMatch = src.match(BARE_RE);
      if (uidMatch) break;
    }
  }

  const uidPrefix = uidMatch?.[1]?.toLowerCase();

  if (!uidPrefix) {
    await saveUnmatched(referenceCode, transferAmount, content, payload as Prisma.InputJsonObject);
    logger.info({ referenceCode, content: content.slice(0, 60) }, "SePay: no uid_prefix in content");
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // 6. Match user by first 8 chars of UUID (id::text LIKE 'XXXXXXXX-%')
  // Dùng raw query vì uid_prefix column có thể rỗng với user cũ (bug đã fix ở verify-otp).
  // UUID format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX → first 8 hex chars = first segment.
  const userRows = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
    SELECT id::text AS id, email FROM users
    WHERE id::text LIKE ${uidPrefix + "-%"}
      AND status = 'ACTIVE'
      AND deleted_at IS NULL
    LIMIT 1
  `;
  const user = userRows[0] ?? null;

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
      transactionDate,
      accountNumber: accountNumber ?? undefined,
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
