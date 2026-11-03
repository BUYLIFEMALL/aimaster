"use client";

import { useState } from "react";
import { isVariantOrderable, variantKey, type OptionGroup, type Variant } from "@/lib/options";
import { discountRate } from "@/lib/products";

export default function ProductDetail({
  name,
  summary,
  images,
  basePrice,
  listPrice,
  soldOut,
  stockMode,
  stock,
  groups,
  variants,
}: {
  name: string;
  summary: string;
  images: { url: string }[];
  basePrice: number;
  listPrice: number | null;
  soldOut: boolean;
  stockMode: "none" | "product";
  stock: number;
  groups: OptionGroup[];
  variants: Variant[];
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>(groups.map(() => ""));
  const stockByOption = stockMode === "product";
  const byKey = new Map(variants.map((v) => [v.key, v]));

  const allPicked = groups.length > 0 && picked.every(Boolean);
  const variant = allPicked ? byKey.get(variantKey(picked)) : undefined;
  const price = basePrice + (variant?.extra_price ?? 0);
  const rate = discountRate(basePrice, listPrice);

  // 이 단의 이 값이 고를 수 있는지 — 앞 단에서 고른 값과 이어지는 조합 중 하나라도 주문 가능하면 고를 수 있다
  const valueAvailable = (level: number, value: string) =>
    variants.some(
      (v) => v.values[level] === value && picked.every((p, i) => i >= level || !p || v.values[i] === p) && isVariantOrderable(v, stockByOption),
    );

  let status: string;
  if (soldOut) status = "품절된 상품입니다.";
  else if (groups.length && !allPicked) status = "옵션을 선택해 주세요.";
  else if (groups.length && (!variant || !isVariantOrderable(variant, stockByOption))) status = "선택한 옵션은 품절입니다.";
  else if (!groups.length && stockMode === "product" && stock <= 0) status = "품절된 상품입니다.";
  else status = "";

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
        <p className="mt-4 text-2xl">
          {rate > 0 && !variant?.extra_price && <span className="mr-2 font-bold text-red-600">{rate}%</span>}
          <b>{price.toLocaleString("ko-KR")}</b>원
          {rate > 0 && <span className="ml-2 text-base text-gray-400 line-through">{listPrice!.toLocaleString("ko-KR")}원</span>}
        </p>

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

        {status && <p className="mt-4 text-sm text-amber-700">{status}</p>}
        <button type="button" disabled className="mt-6 min-h-12 w-full rounded bg-gray-900 text-white opacity-50" title="장바구니는 다음 기능(F09)에서 열립니다">
          장바구니 담기 (준비 중)
        </button>
      </div>
    </div>
  );
}
