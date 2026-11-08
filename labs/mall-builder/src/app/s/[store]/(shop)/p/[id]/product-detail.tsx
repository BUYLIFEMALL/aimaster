"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isVariantOrderable, variantKey, type OptionGroup, type Variant } from "@/lib/options";
import { discountRate } from "@/lib/products";
import { priceLine, MAX_QTY, type PriceContext, type PricingProduct } from "@/lib/pricing";
import { addToCartAction } from "../../cart/actions";
import { requestRestockAction } from "./restock-actions";

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
  visibility,
  priceVisibility,
  ctx,
  moq,
  orderUnit,
  maxQty,
  memberPhone,
}: {
  memberPhone: string | null;
  moq: number;
  orderUnit: number;
  maxQty: number | null;
  visibility: PricingProduct["visibility"];
  priceVisibility: PricingProduct["price_visibility"];
  ctx: PriceContext;
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
  // 최소 수량(주문 단위의 배수)에서 시작
  const [qty, setQty] = useState(Math.max(1, moq));
  const [message, setMessage] = useState<{ text: string; ok: boolean; goto?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const stockByOption = stockMode === "product";
  const byKey = new Map(variants.map((v) => [v.key, v]));

  const allPicked = groups.length > 0 && picked.every(Boolean);
  const variant = allPicked ? byKey.get(variantKey(picked)) ?? null : null;
  // 금액·주문 가능 여부는 장바구니와 같은 가격 엔진으로
  const line = priceLine(
    {
      status, base_price: basePrice, stock_mode: stockMode, stock, option_groups: groups,
      visibility, price_visibility: priceVisibility, moq, order_unit: orderUnit, max_qty: maxQty,
    },
    variant,
    qty,
    ctx,
  );
  const graded = line.breakdown.some((b) => b.label.startsWith("등급가"));
  const rate = graded || line.priceHidden ? 0 : discountRate(basePrice, listPrice);
  const soldOut = status === "sold_out";

  // 이 단의 이 값과 앞 단에서 고른 값으로 이어지는 조합들
  const combos = (level: number, value: string) =>
    variants.filter((v) => v.values[level] === value && picked.every((p, i) => i >= level || !p || v.values[i] === p));
  // 판매하는 조합이 있으면 고를 수 있다(재고가 없어도 골라서 재입고 알림을 신청할 수 있게)
  const valueSelectable = (level: number, value: string) => combos(level, value).some((v) => v.is_active);
  // 주문 가능한 조합이 하나라도 있어야 「품절」 표시가 빠진다
  const valueAvailable = (level: number, value: string) => combos(level, value).some((v) => isVariantOrderable(v, stockByOption));

  // 재입고 알림(D16): 상품 전체 품절, 재고 0, 또는 고른 옵션 품절이면 신청할 수 있다
  const wholeOut =
    soldOut ||
    (status === "on_sale" && stockByOption &&
      (groups.length > 0 ? variants.length > 0 && !variants.some((v) => isVariantOrderable(v, true)) : stock <= 0));
  const variantOut = !wholeOut && status === "on_sale" && stockByOption && variant !== null && variant.is_active && variant.stock <= 0;
  const restockTarget: { variantId: string | null } | null = wholeOut ? { variantId: null } : variantOut ? { variantId: variant!.id } : null;

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
        {line.priceHidden ? (
          <p className="mt-4 rounded bg-gray-50 px-3 py-2 text-gray-700" data-unit-price>{line.errors.find((e) => /가격/.test(e))}</p>
        ) : (
          <p className="mt-4 text-2xl" data-unit-price>
            {graded && <span className="mr-2 rounded bg-blue-50 px-1.5 text-sm text-blue-700">{ctx.gradeName ?? "회원"} 가격</span>}
            {rate > 0 && !variant?.extra_price && <span className="mr-2 font-bold text-red-600">{rate}%</span>}
            <b>{line.unitPrice.toLocaleString("ko-KR")}</b>원
            {graded && <span className="ml-2 text-base text-gray-400 line-through">{(basePrice + (variant?.extra_price ?? 0)).toLocaleString("ko-KR")}원</span>}
            {rate > 0 && <span className="ml-2 text-base text-gray-400 line-through">{listPrice!.toLocaleString("ko-KR")}원</span>}
          </p>
        )}
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
                  <option key={value} value={value} disabled={!valueSelectable(level, value)}>
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
              min={Math.max(1, moq)}
              max={maxQty ?? MAX_QTY}
              step={orderUnit > 1 ? orderUnit : 1}
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

        {(moq > 1 || orderUnit > 1 || maxQty) && (
          <p className="mt-2 text-xs text-gray-500" data-qty-rules>
            {[moq > 1 && `최소 ${moq}개`, orderUnit > 1 && `${orderUnit}개 단위`, maxQty && `최대 ${maxQty}개`].filter(Boolean).join(" · ")}
          </p>
        )}
        {!line.priceHidden && (ctx.tiers ?? []).length > 0 && (
          <ul className="mt-3 space-y-0.5 rounded bg-gray-50 px-3 py-2 text-sm" data-tiers>
            <li className="text-xs text-gray-500">수량 할인</li>
            {(ctx.tiers ?? []).map((t) => (
              <li key={t.min_qty}>
                {t.min_qty}개 이상 ·{" "}
                {t.discount_type === "rate" ? `${t.value}% 할인` : t.discount_type === "amount" ? `개당 ${t.value.toLocaleString("ko-KR")}원 할인` : `개당 ${t.value.toLocaleString("ko-KR")}원`}
              </li>
            ))}
          </ul>
        )}
        {line.errors[0] && <p className="mt-4 text-sm text-amber-700">{line.errors[0]}</p>}
        <button
          type="button"
          onClick={add}
          disabled={!line.orderable || pending}
          className="mt-6 min-h-12 w-full rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {pending ? "담는 중…" : "장바구니 담기"}
        </button>
        {restockTarget && (
          <RestockBox
            key={restockTarget.variantId ?? "whole"}
            slug={slug}
            productId={productId}
            variantId={restockTarget.variantId}
            memberPhone={memberPhone}
          />
        )}
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

// 재입고 알림 신청 상자(D16) — 회원은 가입 번호를 미리 채운다. 동의 체크가 있어야 신청된다
function RestockBox({ slug, productId, variantId, memberPhone }: { slug: string; productId: string; variantId: string | null; memberPhone: string | null }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(memberPhone ?? "");
  const [agree, setAgree] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const submit = () => {
    setResult(null);
    startTransition(async () => setResult(await requestRestockAction(slug, productId, variantId, phone, agree)));
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-12 w-full rounded border border-gray-900 text-gray-900" data-restock-open>
        🔔 재입고 알림 신청{variantId ? "(선택한 옵션)" : ""}
      </button>
    );
  }
  return (
    <div className="mt-3 rounded border p-3" data-restock-box>
      <p className="text-sm font-semibold">재입고 알림 신청{variantId ? " — 선택한 옵션" : ""}</p>
      <p className="mt-1 text-xs text-gray-500">다시 입고되면 이 번호로 문자를 한 번 보내 드립니다(회원은 메일도).</p>
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-1234-5678"
        maxLength={13}
        className="mt-2 w-full rounded border px-3 py-2"
        data-restock-phone
      />
      <label className="mt-2 flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" data-restock-agree />
        재입고 알림을 위해 핸드폰 번호를 수집·이용하는 데 동의합니다. 신청은 90일 뒤 만료되고, 알림이 끝난 뒤 30일이 지나면 번호를 지웁니다.
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !agree || !phone.trim()}
        className="mt-2 min-h-11 w-full rounded bg-gray-900 text-white disabled:opacity-50"
        data-restock-submit
      >
        {pending ? "신청 중…" : "알림 신청하기"}
      </button>
      {result && <p className={`mt-2 text-sm ${result.ok ? "text-green-700" : "text-red-600"}`} data-restock-message>{result.message}</p>}
    </div>
  );
}
