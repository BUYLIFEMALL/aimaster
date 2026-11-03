"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isVariantOrderable, variantKey, type OptionGroup, type Variant } from "@/lib/options";
import { discountRate } from "@/lib/products";
import { priceLine, MAX_QTY, type PricingProduct } from "@/lib/pricing";
import { addToCartAction } from "../../cart/actions";

export default function ProductDetail({
  slug,
  productId,
  name,
  summary,
  images,
  status,
  basePrice,
  listPrice,
  stockMode,
  stock,
  shippingText,
  groups,
  variants,
}: {
  slug: string;
  productId: string;
  shippingText: string;
  name: string;
  summary: string;
  images: { url: string }[];
  status: PricingProduct["status"];
  basePrice: number;
  listPrice: number | null;
  stockMode: "none" | "product";
  stock: number;
  groups: OptionGroup[];
  variants: (Variant & { id: string })[];
}) {
  const router = useRouter();
  const [imageIndex, setImageIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>(groups.map(() => ""));
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<{ text: string; ok: boolean; goto?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const stockByOption = stockMode === "product";
  const byKey = new Map(variants.map((v) => [v.key, v]));

  const allPicked = groups.length > 0 && picked.every(Boolean);
  const variant = allPicked ? byKey.get(variantKey(picked)) ?? null : null;
  // 금액·주문 가능 여부는 장바구니와 같은 가격 엔진으로
  const line = priceLine({ status, base_price: basePrice, stock_mode: stockMode, stock, option_groups: groups }, variant, qty);
  const rate = discountRate(basePrice, listPrice);
  const soldOut = status === "sold_out";

  // 이 단의 이 값이 고를 수 있는지 — 앞 단에서 고른 값과 이어지는 조합 중 하나라도 주문 가능하면 고를 수 있다
  const valueAvailable = (level: number, value: string) =>
    variants.some(
      (v) => v.values[level] === value && picked.every((p, i) => i >= level || !p || v.values[i] === p) && isVariantOrderable(v, stockByOption),
    );

  const add = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await addToCartAction(slug, productId, variant?.id ?? null, qty);
      if (r.ok) setMessage({ text: `장바구니에 담았습니다. (장바구니 ${r.count}개)`, ok: true });
      else if (r.goto) router.push(r.goto);
      else setMessage({ text: r.error, ok: false });
    });
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded bg-gray-100">
          {images[imageIndex] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[imageIndex].url} alt={name} className="h-full w-full object-cover" />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2">
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => setImageIndex(i)} className={`h-16 w-16 overflow-hidden rounded border-2 ${i === imageIndex ? "border-gray-900" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        {summary && <p className="mt-2 text-gray-600">{summary}</p>}
        <p className="mt-4 text-2xl" data-unit-price>
          {rate > 0 && !variant?.extra_price && <span className="mr-2 font-bold text-red-600">{rate}%</span>}
          <b>{line.unitPrice.toLocaleString("ko-KR")}</b>원
          {rate > 0 && <span className="ml-2 text-base text-gray-400 line-through">{listPrice!.toLocaleString("ko-KR")}원</span>}
        </p>
        <p className="mt-2 text-sm text-gray-600" data-shipping>{shippingText}</p>

        {groups.map((g, level) => (
          <label key={g.name} className="mt-4 block">
            <span className="text-sm text-gray-600">{g.name}</span>
            <select
              value={picked[level]}
              onChange={(e) => setPicked((prev) => prev.map((p, i) => (i === level ? e.target.value : i > level ? "" : p)))}
              className="mt-1 w-full rounded border px-3 py-2"
              disabled={soldOut || (level > 0 && !picked[level - 1])}
            >
              <option value="">{level > 0 && !picked[level - 1] ? "앞 옵션을 먼저 선택" : `${g.name} 선택`}</option>
              {g.values.map((value) => {
                const ok = valueAvailable(level, value);
                const extra = level === groups.length - 1 ? byKey.get(variantKey([...picked.slice(0, level), value]))?.extra_price : undefined;
                return (
                  <option key={value} value={value} disabled={!ok}>
                    {value}
                    {extra ? ` (${extra > 0 ? "+" : ""}${extra.toLocaleString("ko-KR")}원)` : ""}
                    {!ok ? " - 품절" : ""}
                  </option>
                );
              })}
            </select>
          </label>
        ))}

        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            수량
            <input
              type="number"
              name="qty"
              min={1}
              max={MAX_QTY}
              value={qty}
              disabled={soldOut}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="w-20 rounded border px-2 py-1.5"
            />
          </label>
          <p className="text-lg" data-line-total>
            합계 <b>{line.lineTotal.toLocaleString("ko-KR")}</b>원
          </p>
        </div>

        {line.errors[0] && <p className="mt-4 text-sm text-amber-700">{line.errors[0]}</p>}
        <button
          type="button"
          onClick={add}
          disabled={!line.orderable || pending}
          className="mt-6 min-h-12 w-full rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {pending ? "담는 중…" : "장바구니 담기"}
        </button>
        {message && (
          <p className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-red-600"}`} data-cart-message>
            {message.text}
            {message.ok && (
              <>
                {" "}
                <Link href={`/s/${slug}/cart`} className="underline">장바구니 보기</Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
