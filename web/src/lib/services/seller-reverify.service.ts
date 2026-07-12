import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { deleteLocalFile } from "@/lib/storage/local";
import type { SubmitSellerReverifyInput } from "@/lib/validation/seller-reverify.schema";

export async function submitSellerReverify(
  sellerId: string,
  input: SubmitSellerReverifyInput,
) {
  // Chỉ cho phép 1 yêu cầu PENDING tại một thời điểm
  const existing = await prisma.sellerReverifyRequest.findFirst({
    where: { sellerId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    throw new ValidationError("Bạn đã có yêu cầu xác minh lại đang chờ duyệt");
  }

  const request = await prisma.sellerReverifyRequest.create({
    data: {
      sellerId,
      cccdImageUrl:     input.cccdImageUrl,
      portraitImageUrl: input.portraitImageUrl,
    },
    select: { id: true, createdAt: true },
  });

  return request;
}

export async function getSellerReverifyRequests(sellerId: string) {
  return prisma.sellerReverifyRequest.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true, status: true, rejectReason: true,
      createdAt: true, reviewedAt: true,
      cccdImageUrl: true, portraitImageUrl: true,
    },
  });
}

export async function reviewSellerReverify(
  requestId: string,
  adminId: string,
  action: "approve" | "reject",
  rejectReason?: string,
) {
  const req = await prisma.sellerReverifyRequest.findUnique({
    where: { id: requestId },
    select: { id: true, sellerId: true, status: true, cccdImageUrl: true, portraitImageUrl: true },
  });
  if (!req) throw new NotFoundError("Yêu cầu xác minh lại");
  if (req.status !== "PENDING") {
    throw new ValidationError("Yêu cầu này đã được xử lý");
  }

  if (action === "approve") {
    // Ảnh cũ cần xóa khỏi disk VPS sau khi ghi đè thành công — lấy trước khi update
    const oldUser = await prisma.user.findUnique({
      where: { id: req.sellerId },
      select: { cccdImageUrl: true, portraitImageUrl: true },
    });

    await prisma.$transaction([
      // Ảnh xác minh lại thay thế luôn ảnh CCCD/chân dung gốc lúc đăng ký
      prisma.user.update({
        where: { id: req.sellerId },
        data: {
          sellerReverifyApproved: true,
          cccdImageUrl:           req.cccdImageUrl,
          portraitImageUrl:       req.portraitImageUrl,
        },
      }),
      prisma.sellerReverifyRequest.update({
        where: { id: requestId },
        data: {
          status:           "APPROVED",
          reviewedByUserId: adminId,
          reviewedAt:       new Date(),
        },
      }),
    ]);

    // Xóa file ảnh cũ trên disk — best-effort, không chặn kết quả duyệt nếu lỗi.
    // Bỏ qua nếu ảnh cũ trùng ảnh mới (tránh xóa nhầm file vừa được duyệt).
    await Promise.all([
      oldUser?.cccdImageUrl !== req.cccdImageUrl ? deleteLocalFile(oldUser?.cccdImageUrl) : Promise.resolve(),
      oldUser?.portraitImageUrl !== req.portraitImageUrl ? deleteLocalFile(oldUser?.portraitImageUrl) : Promise.resolve(),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId:    adminId,
        action:     "SELLER_REVERIFY_APPROVED",
        targetType: "SellerReverifyRequest",
        targetId:   requestId,
        after:      { sellerId: req.sellerId },
      },
    });
  } else {
    await prisma.sellerReverifyRequest.update({
      where: { id: requestId },
      data: {
        status:           "REJECTED",
        rejectReason:     rejectReason ?? "Không hợp lệ",
        reviewedByUserId: adminId,
        reviewedAt:       new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId:    adminId,
        action:     "SELLER_REVERIFY_REJECTED",
        targetType: "SellerReverifyRequest",
        targetId:   requestId,
        after:      { rejectReason: rejectReason ?? null },
      },
    });
  }
}
