"use client";

import { useState, useTransition } from "react";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { deleteProductAction, refreshAliexpressImageAction } from "@/lib/actions/products";
import { PLATFORM_LABELS, type AffiliateProduct } from "@/types/product";
import { ShoppingBag } from "lucide-react";

function formatImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let formatted = url.trim();
  if (formatted.startsWith("//")) {
    formatted = `https:${formatted}`;
  } else if (formatted.startsWith("http://")) {
    formatted = formatted.replace("http://", "https://");
  }
  return formatted;
}

function ProductItem({ product }: { product: AffiliateProduct }) {
  const [imgError, setImgError] = useState(false);
  const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const formattedUrl = formatImageUrl(refreshedUrl ?? product.image_url);
  const canRefreshImage = product.platform === "aliexpress" && (!formattedUrl || imgError);

  const handleRefreshImage = () => {
    setRefreshError(null);
    startRefresh(async () => {
      const result = await refreshAliexpressImageAction(product.id);
      if (result.imageUrl) {
        setRefreshedUrl(result.imageUrl);
        setImgError(false);
      } else {
        setRefreshError(result.error ?? "이미지를 가져오지 못했습니다.");
      }
    });
  };

  return (
    <li className="flex items-center gap-3 p-4 hover:bg-neutral-50/80 transition-colors">
      {formattedUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={formattedUrl}
          alt={product.product_name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-12 w-12 rounded-lg object-cover border border-neutral-200 shadow-2xs"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 border border-neutral-200 flex items-center justify-center text-neutral-400">
          <ShoppingBag className="h-5 w-5 text-neutral-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{product.product_name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">{PLATFORM_LABELS[product.platform] || product.platform}</span>
          {product.price && <span>· {product.price.toLocaleString()}원</span>}
          {product.input_mode === "manual" && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
              상세정보 등록됨
            </span>
          )}
        </p>
        {canRefreshImage && (
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshImage}
              disabled={isRefreshing}
              className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              {isRefreshing ? "이미지 가져오는 중..." : "🖼 이미지 다시 가져오기"}
            </button>
            {refreshError && <span className="text-[11px] text-red-600">{refreshError}</span>}
          </div>
        )}
      </div>
      <form action={deleteProductAction}>
        <input type="hidden" name="productId" value={product.id} />
        <DeleteButton />
      </form>
    </li>
  );
}

export function ProductList({ products }: { products: AffiliateProduct[] }) {
  if (products.length === 0) {
    return <p className="p-6 text-center text-sm text-neutral-500">등록된 상품이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </ul>
  );
}

