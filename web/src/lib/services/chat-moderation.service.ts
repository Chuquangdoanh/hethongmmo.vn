import { prisma } from "@/lib/db/prisma";
import type { ChatViolationSource } from "@prisma/client";
import { notifyChatViolation } from "@/lib/services/telegram-alert.service";

const CHAT_MODERATION_CONFIG_KEY = "chat_moderation_config";

// Bắt số điện thoại VN kể cả khi viết cách/gạch ngang — strip ký tự không phải số
// trước khi so khớp đầu số di động hợp lệ (03/05/07/08/09 hoặc +84 tương ứng).
const VN_PHONE_DIGITS_REGEX = /(84|0)[35789]\d{8}/;

export function containsPhoneNumber(content: string): boolean {
  const digitsOnly = content.replace(/[^\d]/g, "");
  return VN_PHONE_DIGITS_REGEX.test(digitsOnly);
}

export async function getBannedKeywords(): Promise<string[]> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: CHAT_MODERATION_CONFIG_KEY },
    select: { value: true },
  });
  const value = config?.value as { bannedKeywords?: string[] } | undefined;
  return value?.bannedKeywords ?? [];
}

export function scanChatContent(content: string, bannedKeywords: string[]): { matchedTerm: string } | null {
  if (containsPhoneNumber(content)) return { matchedTerm: "Số điện thoại" };

  const lowerContent = content.toLowerCase();
  for (const keyword of bannedKeywords) {
    if (keyword && lowerContent.includes(keyword.toLowerCase())) {
      return { matchedTerm: keyword };
    }
  }
  return null;
}

const SOURCE_LABELS: Record<ChatViolationSource, string> = {
  PRESALE_CHAT: "Tin nhắn trước khi mua",
  SUPPORT_TICKET: "Hỗ trợ sau khi mua",
  COMPLAINT_CHAT: "Chat khiếu nại",
};

export async function checkAndLogChatViolation(params: {
  source: ChatViolationSource;
  refId: string;
  senderId: string;
  senderName: string;
  senderRole: "USER" | "SELLER";
  content: string;
}): Promise<{ blocked: boolean; matchedTerm?: string }> {
  const bannedKeywords = await getBannedKeywords();
  const match = scanChatContent(params.content, bannedKeywords);
  if (!match) return { blocked: false };

  await prisma.chatViolation.create({
    data: {
      source: params.source,
      refId: params.refId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      content: params.content,
      matchedTerm: match.matchedTerm,
    },
  });

  notifyChatViolation(
    params.senderName,
    params.senderRole,
    SOURCE_LABELS[params.source],
    match.matchedTerm,
    params.content,
  );

  return { blocked: true, matchedTerm: match.matchedTerm };
}
