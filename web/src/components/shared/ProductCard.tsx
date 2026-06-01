import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { formatVnd } from "@/lib/utils/format";

type ProductType = "service" | "course" | "tuttrick" | "mmo" | "seller";

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    thumbnail?: string | null;
    price?: number | string | null;
    salePrice?: number | string | null;
    originalPrice?: number | string | null;
    rating?: number | null;
    badge?: string | null;
    platform?: string | null;
    isFeatured?: boolean | null;
    stockCount?: number | null;
  };
  type: ProductType;
}

const BADGE_STYLES: Record<string, string> = {
  HOT:     "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
  NEW:     "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  VIP:     "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  POPULAR: "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30",
  TREND:   "bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30",
};

const TYPE_HREF: Record<ProductType, string> = {
  service:  "/dich-vu",
  course:   "/khoa-hoc",
  tuttrick: "/tut-tricks",
  mmo:      "/tai-nguyen-mmo",
  seller:   "/marketplace",
};

function renderPrice(product: ProductCardProps["product"]) {
  const sale = product.salePrice != null ? Number(product.salePrice) : null;
  const orig = product.originalPrice != null ? Number(product.originalPrice) : null;
  const price = product.price != null ? Number(product.price) : null;

  if (sale !== null && orig !== null && sale < orig) {
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-bold text-[#E53E3E]">{formatVnd(sale)}</span>
        <span className="text-xs text-[#888888] line-through">{formatVnd(orig)}</span>
      </div>
    );
  }
  const display = sale ?? price ?? orig;
  if (display === null) return null;
  return display === 0
    ? <span className="text-sm font-bold text-[#10B981]">Miễn phí</span>
    : <span className="text-base font-bold text-[#F4F4F5]">{formatVnd(display)}</span>;
}

export default function ProductCard({ product, type }: ProductCardProps) {
  const href = `${TYPE_HREF[type]}/${product.slug}`;
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;
  const isOutOfStock = type === "mmo" && product.stockCount === 0;

  return (
    <Link href={href} className="group block">
      <article className={`relative rounded-xl border bg-[#14141F] overflow-hidden transition-all duration-200
        ${isOutOfStock
          ? "border-[#2A2A38] opacity-75"
          : "border-[#2A2A38] hover:border-[#7C3AED] hover:scale-[1.02] hover:shadow-lg hover:shadow-[#7C3AED]/10"
        }`}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-[#1F1F2E] overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#71717A]">
              <span className="text-xs">Không có ảnh</span>
            </div>
          )}

          {/* Platform badge */}
          {product.platform && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold
              bg-black/60 text-[#F4F4F5] backdrop-blur-sm border border-white/10">
              {product.platform}
            </span>
          )}

          {/* Featured / badge */}
          {(badgeStyle || product.isFeatured) && (
            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold border ${
              badgeStyle ?? BADGE_STYLES["HOT"]
            }`}>
              {product.badge && product.badge !== "NONE" ? product.badge : "HOT"}
            </span>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                HẾT HÀNG
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[#F4F4F5] leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating != null && (
            <div className="flex items-center gap-1 text-xs text-[#F59E0B]">
              <Star size={11} fill="currentColor" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Stock warning */}
          {type === "mmo" && product.stockCount != null && product.stockCount > 0 && product.stockCount < 5 && (
            <span className="inline-block text-[10px] font-medium text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded">
              Sắp hết hàng
            </span>
          )}

          {/* Price */}
          <div className="pt-1">{renderPrice(product)}</div>
        </div>
      </article>
    </Link>
  );
}
