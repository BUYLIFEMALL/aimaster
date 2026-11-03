import Link from "next/link";
import type { ProductRow } from "@/lib/store";
import { discountRate } from "@/lib/products";

// 손님 화면 상품 카드 — 디자인은 나중에 테마로 입힌다. 지금은 기능 위주.
export function ProductCard({ base, product }: { base: string; product: ProductRow }) {
  const rate = discountRate(product.base_price, product.list_price);
  const soldOut = product.status === "sold_out";
  const img = product.images?.[0]?.url;
  return (
    <Link href={`${base}/p/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded bg-gray-100">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        )}
        {rate > 0 && <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">{rate}%</span>}
        {soldOut && <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold text-gray-700">품절</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-sm">{product.name}</p>
      <p className="mt-1">
        <b>{product.base_price.toLocaleString("ko-KR")}</b>원
        {rate > 0 && <span className="ml-1 text-xs text-gray-400 line-through">{product.list_price!.toLocaleString("ko-KR")}원</span>}
      </p>
    </Link>
  );
}

export function ProductGrid({ base, products, empty }: { base: string; products: ProductRow[]; empty: string }) {
  if (!products.length) return <p className="py-12 text-center text-gray-500">{empty}</p>;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard base={base} product={p} />
        </li>
      ))}
    </ul>
  );
}
