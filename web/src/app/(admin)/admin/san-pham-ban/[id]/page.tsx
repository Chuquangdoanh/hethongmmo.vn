import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { requireStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { decrypt } from "@/lib/security/encryption";
import { r2Url } from "@/lib/utils/image-url";
import Pagination from "@/components/shared/Pagination";
import RestrictButton from "../_components/RestrictButton";
import ApprovalButton from "../_components/ApprovalButton";
import ImageZoom from "../_components/ImageZoom";
import ReviewActions from "./_components/ReviewActions";
import VariantManager from "@/components/shared/VariantManager";
import ProductGalleryManager from "@/components/shared/ProductGalleryManager";

export const metadata: Metadata = { title: "Chi tiết sản phẩm" };

const PAGE_SIZE        = 50;
const REVIEW_PAGE_SIZE = 20;

const STOCK_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  SOLD:      "bg-gray-100 text-gray-500 border-gray-200",
};

const STOCK_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Còn hàng",
  RESERVED:  "Đang giữ",
  SOLD:      "Đã bán",
};

const RATING_BADGE: Record<number, string> = {
  5: "bg-emerald-50 text-emerald-700 border-emerald-200",
  4: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-amber-50 text-amber-700 border-amber-200",
  2: "bg-orange-50 text-orange-700 border-orange-200",
  1: "bg-red-50 text-red-700 border-red-200",
};

export default async function AdminSellerProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string; rating?: string; rp?: string }>;
}) {
  const session = await auth();
  requireStaff(session);

  const { id } = await params;
  const { page, status, rating, rp } = await searchParams;

  const currentPage  = Math.max(1, parseInt(page ?? "1", 10));
  const reviewPage   = Math.max(1, parseInt(rp   ?? "1", 10));
  const ratingFilter = rating ? parseInt(rating, 10) : undefined;

  const product = await prisma.sellerProduct.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, price: true, description: true,
      warrantyInfo: true,
      imageUrl: true, sellerCategory: true, publishDate: true,
      subCategory: { select: { name: true } },
      isActive: true, isHidden: true, isRestricted: true,
      approvalStatus: true, approvalRejectReason: true,
      salesCount: true, createdAt: true, updatedAt: true,
      seller: { select: { id: true, fullName: true, email: true } },
      _count: { select: { orders: true } },
    },
  });

  if (!product) notFound();

  const sellerRequest = await prisma.sellerRequest.findFirst({
    where: { userId: product.seller.id, status: "APPROVED" },
    select: { id: true },
  });

  // Review stats (always all ratings — for summary + distribution bar)
  const reviewDistribution = await prisma.review.groupBy({
    by: ["rating"],
    where: { productType: "SELLER_PRODUCT", productId: id },
    _count: { id: true },
  });

  const reviewTotal = reviewDistribution.reduce((s, r) => s + r._count.id, 0);
  const avgRating   = reviewTotal > 0
    ? reviewDistribution.reduce((s, r) => s + r.rating * r._count.id, 0) / reviewTotal
    : 0;
  const distMap = new Map(reviewDistribution.map((r) => [r.rating, r._count.id]));

  // Filtered review list with pagination
  const reviewWhere = {
    productType: "SELLER_PRODUCT",
    productId: id,
    ...(ratingFilter ? { rating: ratingFilter } : {}),
  };

  const [
    availableCount, reservedCount, soldCount,
    reviews, filteredReviewTotal, revenueByStatus,
  ] = await Promise.all([
    prisma.sellerProductStock.count({ where: { productId: id, status: "AVAILABLE" } }),
    prisma.sellerProductStock.count({ where: { productId: id, status: "RESERVED"  } }),
    prisma.sellerProductStock.count({ where: { productId: id, status: "SOLD"      } }),
    prisma.review.findMany({
      where: reviewWhere,
      orderBy: { createdAt: "desc" },
      skip: (reviewPage - 1) * REVIEW_PAGE_SIZE,
      take: REVIEW_PAGE_SIZE,
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.review.count({ where: reviewWhere }),
    // Doanh thu ghi nhận = tổng đơn hoàn thành - tổng đơn hoàn tiền
    prisma.order.groupBy({
      by: ["status"],
      where: { sellerProductId: id, status: { in: ["DONE", "REFUNDED"] } },
      _sum: { finalPrice: true },
    }),
  ]);

  const doneRevenue     = Number(revenueByStatus.find((r) => r.status === "DONE")?._sum.finalPrice ?? 0);
  const refundedRevenue = Number(revenueByStatus.find((r) => r.status === "REFUNDED")?._sum.finalPrice ?? 0);
  const recordedRevenue = doneRevenue - refundedRevenue;

  const reviewTotalPages = Math.ceil(filteredReviewTotal / REVIEW_PAGE_SIZE);

  const statusFilter =
    status === "AVAILABLE" ? ("AVAILABLE" as const) :
    status === "RESERVED"  ? ("RESERVED"  as const) :
    status === "SOLD"      ? ("SOLD"      as const) : undefined;

  const stockWhere = {
    productId: id,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [stockItems, stockTotal] = await Promise.all([
    prisma.sellerProductStock.findMany({
      where: stockWhere,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, status: true, contentEnc: true,
        soldToUserId: true, orderId: true, soldAt: true, createdAt: true,
      },
    }),
    prisma.sellerProductStock.count({ where: stockWhere }),
  ]);

  const stockWithContent = stockItems.map((item) => {
    let content = "";
    try {
      content = decrypt(item.contentEnc as Buffer);
    } catch {
      content = "(lỗi giải mã)";
    }
    return { ...item, content };
  });

  const soldUserIds = stockWithContent
    .filter((i) => i.soldToUserId != null)
    .map((i) => i.soldToUserId!);

  const buyers =
    soldUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: soldUserIds } },
          select: { id: true, email: true },
        })
      : [];
  const buyerMap = new Map(buyers.map((b) => [b.id, b.email]));

  const totalPages = Math.ceil(stockTotal / PAGE_SIZE);
  const searchParamsObj: Record<string, string> = {};
  if (status) searchParamsObj.status = status;

  // Helper: build review filter URL preserving stock params
  function reviewUrl(params: { rating?: string; rp?: string }) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (page && page !== "1") sp.set("page", page);
    if (params.rating) sp.set("rating", params.rating);
    if (params.rp && params.rp !== "1") sp.set("rp", params.rp);
    const str = sp.toString();
    return `/admin/san-pham-ban/${id}${str ? `?${str}` : ""}`;
  }

  const reviewPaginationParams: Record<string, string> = {};
  if (status) reviewPaginationParams.status = status;
  if (rating) reviewPaginationParams.rating = rating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/san-pham-ban" className="text-xs text-gray-500 hover:text-gray-700">
          ← Sản phẩm nhà bán
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Seller:{" "}
            <Link href={sellerRequest ? `/admin/sellers/${sellerRequest.id}` : `/admin/sellers`} className="text-blue-600 hover:underline">
              {product.seller.fullName}
            </Link>
            {" "}·{" "}{product.seller.email}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ApprovalButton
            productId={product.id}
            productName={product.name}
            approvalStatus={product.approvalStatus}
          />
          <RestrictButton
            productId={product.id}
            productName={product.name}
            isRestricted={product.isRestricted}
          />
        </div>
      </div>

      {/* Product info */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Thông tin sản phẩm</h2>

        {product.imageUrl && (
          <div className="mb-4">
            <ImageZoom src={r2Url(product.imageUrl)} alt={product.name} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            { label: "Danh mục", value: product.sellerCategory },
            { label: "Danh mục con", value: product.subCategory?.name ?? "—" },
            { label: "Giá bán", value: formatVnd(Number(product.price)) },
            { label: "Tổng đơn", value: product._count.orders.toLocaleString("vi-VN") },
            { label: "Doanh thu ghi nhận", value: formatVnd(recordedRevenue) },
            { label: "Tạo lúc", value: formatDate(product.createdAt) },
            { label: "Cập nhật", value: formatDate(product.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-800">{value}</p>
            </div>
          ))}

          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Đánh giá TB</p>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-base leading-none ${s <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}`}>★</span>
                ))}
              </div>
              <span className="text-sm font-semibold text-amber-500">{avgRating.toFixed(1)}</span>
              <span className="text-[11px] text-gray-400">({reviewTotal})</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            product.isRestricted
              ? "bg-red-50 text-red-700 border-red-200"
              : product.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}>
            {product.isRestricted ? "Bị hạn chế" : product.isActive ? "Đang bán" : "Ẩn"}
          </span>
          {product.isHidden && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-orange-50 text-orange-700 border-orange-200">
              Đang ẩn
            </span>
          )}
        </div>

        {product.description && (
          <div className="mt-4">
            <p className="text-[10px] text-gray-500 mb-1">Mô tả</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {product.warrantyInfo && (
          <div className="mt-4">
            <p className="text-[10px] text-gray-500 mb-1">Thông tin bảo hành</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{product.warrantyInfo}</p>
          </div>
        )}
      </div>

      {/* Biến thể sản phẩm */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <VariantManager productId={product.id} isAdmin apiBase="/api/seller/products" />
      </div>

      {/* Thư viện ảnh sản phẩm */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <ProductGalleryManager
          productId={product.id}
          apiBase="/api/seller/products"
          uploadUrl="/api/storage/upload"
          uploadResponseKey="publicUrl"
          uploadPurpose="product-image"
          isAdmin
        />
      </div>

      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Còn trong kho", value: availableCount, color: "text-emerald-600" },
          { label: "Đang giữ",     value: reservedCount,  color: "text-yellow-600"  },
          { label: "Đã bán",       value: soldCount,       color: "text-gray-600"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString("vi-VN")}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Stock items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Kho hàng chi tiết</h2>
          <span className="text-xs text-gray-500">{stockTotal.toLocaleString("vi-VN")} mục</span>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { key: "", label: "Tất cả" },
            { key: "AVAILABLE", label: "Còn hàng" },
            { key: "RESERVED",  label: "Đang giữ"  },
            { key: "SOLD",      label: "Đã bán"    },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={key ? `/admin/san-pham-ban/${id}?status=${key}` : `/admin/san-pham-ban/${id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                (status ?? "") === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          {stockWithContent.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">Không có mục kho nào</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-14">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Nội dung</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Người mua</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày thêm</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockWithContent.map((item, i) => (
                      <tr key={item.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50/60 transition-colors`}>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {(currentPage - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-gray-700 break-all max-w-[320px]">
                            {item.content.length > 120 ? `${item.content.slice(0, 120)}…` : item.content}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STOCK_STATUS_STYLES[item.status] ?? ""}`}>
                            {STOCK_STATUS_LABELS[item.status] ?? item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.soldToUserId
                            ? buyerMap.get(item.soldToUserId) ?? item.soldToUserId.slice(0, 8) + "…"
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {item.soldAt ? formatDate(item.soldAt) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/admin/san-pham-ban/${id}`} searchParams={searchParamsObj} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Đánh giá khách hàng</h2>
          <span className="text-xs text-gray-500">{reviewTotal.toLocaleString("vi-VN")} đánh giá</span>
        </div>

        {/* Summary bar — always shows ALL ratings */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-3 flex items-center gap-6">
          <div className="text-center shrink-0">
            <p className="text-4xl font-bold text-amber-400">{avgRating.toFixed(1)}</p>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-lg leading-none ${s <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}`}>★</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{reviewTotal} đánh giá</p>
          </div>

          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const cnt = distMap.get(star) ?? 0;
              const pct = reviewTotal > 0 ? (cnt / reviewTotal) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-4 text-right">{star}</span>
                  <span className="text-amber-400 text-[11px]">★</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-gray-400">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rating filter tabs ── */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs text-gray-400 shrink-0">Lọc:</span>
          <Link
            href={reviewUrl({})}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              !rating
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            }`}
          >
            Tất cả
          </Link>
          {[5, 4, 3, 2, 1].map((r) => {
            const cnt = distMap.get(r) ?? 0;
            const active = rating === String(r);
            return (
              <Link
                key={r}
                href={reviewUrl({ rating: String(r) })}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  active
                    ? "bg-amber-400 text-white border-amber-400"
                    : "bg-white text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                {r}★
                <span className={`text-[10px] ${active ? "text-white/80" : "text-gray-400"}`}>
                  ({cnt})
                </span>
              </Link>
            );
          })}
        </div>

        {/* Review list */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm">
                {ratingFilter ? `Không có đánh giá ${ratingFilter}★` : "Chưa có đánh giá nào"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Khách hàng</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Sao</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bình luận</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ngày</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review, i) => (
                      <tr key={review.id} className={`${i !== 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50/60 transition-colors`}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">{review.user.fullName ?? "—"}</p>
                          <p className="text-[11px] text-gray-400">{review.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${RATING_BADGE[review.rating] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                            {review.rating}★
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                          {review.comment
                            ? <span className="line-clamp-2">{review.comment}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <ReviewActions reviewId={review.id} initRating={review.rating} initComment={review.comment} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {reviewTotalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination
                    currentPage={reviewPage}
                    totalPages={reviewTotalPages}
                    basePath={`/admin/san-pham-ban/${id}`}
                    searchParams={reviewPaginationParams}
                    pageParam="rp"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
