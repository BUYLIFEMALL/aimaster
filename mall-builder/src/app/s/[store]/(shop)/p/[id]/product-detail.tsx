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
  const special = line.breakdown.some((b) => b.label === "거래처 특가"); // D24
  const graded = special || line.breakdown.some((b) => b.label.startsWith("등급가"));
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
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* 사진 갤러리 */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs">
          {images[imageIndex] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[imageIndex].url} alt={name} className="h-full w-full object-cover" />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setImageIndex(i)}
                className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                  i === imageIndex ? "border-blue-600 shadow-sm" : "border-slate-200 opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 상품 정보 및 구매 옵션 */}
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
          {name}
        </h1>
        {summary && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{summary}</p>}

        <div className="mt-4 pb-4 border-b border-slate-100">
          {line.priceHidden ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700" data-unit-price>
              {line.errors.find((e) => /가격/.test(e))}
            </p>
          ) : (
            <div className="flex flex-col" data-unit-price>
              <div className="flex flex-wrap items-baseline gap-2">
                {graded && (
                  <span className="rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-xs font-bold text-blue-700" data-price-badge>
                    {special ? "거래처 특가" : `${ctx.gradeName ?? "회원"} 가격`}
                  </span>
                )}
                {rate > 0 && !variant?.extra_price && (
                  <span className="text-2xl font-black text-rose-600">{rate}%</span>
                )}
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  <b>{line.unitPrice.toLocaleString("ko-KR")}</b>원
                </span>
              </div>
              {(graded || rate > 0) && (
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 line-through">
                  {graded && <span>{(basePrice + (variant?.extra_price ?? 0)).toLocaleString("ko-KR")}원</span>}
                  {rate > 0 && <span>{listPrice!.toLocaleString("ko-KR")}원</span>}
                </div>
              )}
            </div>
          )}
          <p className="mt-2.5 text-xs font-medium text-slate-500 flex items-center gap-1.5" data-shipping>
            <span className="text-slate-400">🚚</span>
            <span>{shippingText}</span>
          </p>
        </div>

        {/* 옵션 선택 */}
        {groups.map((g, level) => (
          <label key={g.name} className="mt-4 block">
            <span className="text-xs font-bold text-slate-700">{g.name}</span>
            <select
              value={picked[level]}
              onChange={(e) => setPicked((prev) => prev.map((p, i) => (i === level ? e.target.value : i > level ? "" : p)))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
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

        {/* 수량 조절 및 총 금액 */}
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>수량</span>
              <input
                type="number"
                name="qty"
                min={Math.max(1, moq)}
                max={maxQty ?? MAX_QTY}
                step={orderUnit > 1 ? orderUnit : 1}
                value={qty}
                disabled={soldOut}
                onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </label>
            <p className="text-base text-slate-700" data-line-total>
              합계 <b className="text-xl font-black text-slate-900">{line.lineTotal.toLocaleString("ko-KR")}</b>원
            </p>
          </div>

          {(moq > 1 || orderUnit > 1 || maxQty) && (
            <p className="mt-2 text-[11px] font-medium text-slate-500" data-qty-rules>
              {[moq > 1 && `최소 ${moq}개`, orderUnit > 1 && `${orderUnit}개 단위`, maxQty && `최대 ${maxQty}개`].filter(Boolean).join(" · ")}
            </p>
          )}

          {!line.priceHidden && (ctx.tiers ?? []).length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-xs" data-tiers>
              <li className="font-bold text-blue-600">📊 대량 구매 수량 할인</li>
              {(ctx.tiers ?? []).map((t) => (
                <li key={t.min_qty} className="text-slate-600 font-medium">
                  {t.min_qty}개 이상 ·{" "}
                  {t.discount_type === "rate" ? `${t.value}% 할인` : t.discount_type === "amount" ? `개당 ${t.value.toLocaleString("ko-KR")}원 할인` : `개당 ${t.value.toLocaleString("ko-KR")}원`}
                </li>
              ))}
            </ul>
          )}
        </div>

        {line.errors[0] && <p className="mt-3 text-xs font-semibold text-amber-700">{line.errors[0]}</p>}

        {/* 장바구니 담기 3D 버튼 */}
        <button
          type="button"
          onClick={add}
          disabled={!line.orderable || pending}
          className="mt-6 min-h-13 w-full btn-3d-blue text-base font-bold tracking-tight disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
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
          <div className={`mt-4 rounded-xl border p-3.5 text-sm font-medium ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`} data-cart-message>
            {message.text}
            {message.ok && (
              <>
                {" "}
                <Link href={`/s/${slug}/cart`} className="font-bold underline text-emerald-900 hover:text-emerald-700">
                  장바구니 보기 ›
                </Link>
              </>
            )}
          </div>
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        data-restock-open
      >
        🔔 재입고 알림 신청{variantId ? "(선택한 옵션)" : ""}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs" data-restock-box>
      <p className="text-sm font-bold text-slate-900">재입고 알림 신청{variantId ? " — 선택한 옵션" : ""}</p>
      <p className="mt-1 text-xs text-slate-500">다시 입고되면 이 번호로 문자를 한 번 보내 드립니다(회원은 메일도).</p>
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-1234-5678"
        maxLength={13}
        className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden"
        data-restock-phone
      />
      <label className="mt-2 flex items-start gap-2 text-xs text-slate-600 leading-snug">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" data-restock-agree />
        재입고 알림을 위해 핸드폰 번호를 수집·이용하는 데 동의합니다. 신청은 90일 뒤 만료되고, 알림이 끝난 뒤 30일이 지나면 번호를 지웁니다.
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !agree || !phone.trim()}
        className="mt-3 min-h-10 w-full btn-3d-dark text-xs disabled:opacity-40"
        data-restock-submit
      >
        {pending ? "신청 중…" : "알림 신청하기"}
      </button>
      {result && <p className={`mt-2 text-xs font-semibold ${result.ok ? "text-emerald-700" : "text-rose-600"}`} data-restock-message>{result.message}</p>}
    </div>
  );
}
