"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  const [showFloating, setShowFloating] = useState(false);
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

  const step = orderUnit > 1 ? orderUnit : 1;
  const minVal = Math.max(1, moq);
  const maxVal = maxQty ?? MAX_QTY;
  const decreaseQty = () => setQty((prev) => Math.max(minVal, prev - step));
  const increaseQty = () => setQty((prev) => Math.min(maxVal, prev + step));

  useEffect(() => {
    const handleScroll = () => {
      setShowFloating(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* 사진 갤러리 */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-100 shadow-xs">
            {images[imageIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[imageIndex].url} alt={name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">
                이미지 없음
              </div>
            )}
            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
                <span className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white shadow-lg">
                  품절된 상품입니다
                </span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3.5 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer ${
                    i === imageIndex
                      ? "border-blue-600 shadow-md ring-2 ring-blue-100 scale-102"
                      : "border-slate-200 opacity-70 hover:opacity-100"
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
          <div className="border-b border-slate-100 pb-5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              {name}
            </h1>
            {summary && <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">{summary}</p>}

            <div className="mt-4 pt-4 border-t border-slate-100/80">
              {line.priceHidden ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700" data-unit-price>
                  {line.errors.find((e) => /가격/.test(e))}
                </p>
              ) : (
                <div className="flex flex-col" data-unit-price>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    {graded && (
                      <span className="rounded-lg bg-blue-50 border border-blue-200/90 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-2xs" data-price-badge>
                        {special ? "🏢 거래처 특가" : `💼 ${ctx.gradeName ?? "회원"} 가격`}
                      </span>
                    )}
                    {rate > 0 && !variant?.extra_price && (
                      <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">{rate}%</span>
                    )}
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      <b>{line.unitPrice.toLocaleString("ko-KR")}</b>
                      <span className="text-2xl sm:text-3xl font-bold ml-0.5">원</span>
                    </span>
                  </div>
                  {(graded || rate > 0) && (
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-400 line-through">
                      {graded && <span>{(basePrice + (variant?.extra_price ?? 0)).toLocaleString("ko-KR")}원</span>}
                      {rate > 0 && <span>{listPrice!.toLocaleString("ko-KR")}원</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-100" data-shipping>
                <span className="text-base">🚚</span>
                <span>배송안내: <strong>{shippingText}</strong></span>
              </div>
            </div>
          </div>

          {/* 옵션 선택 */}
          {groups.length > 0 && (
            <div className="mt-5 space-y-4">
              {groups.map((g, level) => (
                <label key={g.name} className="block">
                  <span className="text-xs font-bold text-slate-700">{g.name} 선택</span>
                  <select
                    value={picked[level]}
                    onChange={(e) => setPicked((prev) => prev.map((p, i) => (i === level ? e.target.value : i > level ? "" : p)))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                    disabled={soldOut || (level > 0 && !picked[level - 1])}
                  >
                    <option value="">{level > 0 && !picked[level - 1] ? "상위 옵션을 먼저 선택하세요" : `${g.name} 선택`}</option>
                    {g.values.map((value) => {
                      const ok = valueAvailable(level, value);
                      const extra = level === groups.length - 1 ? byKey.get(variantKey([...picked.slice(0, level), value]))?.extra_price : undefined;
                      return (
                        <option key={value} value={value} disabled={!valueSelectable(level, value)}>
                          {value}
                          {extra ? ` (${extra > 0 ? "+" : ""}${extra.toLocaleString("ko-KR")}원)` : ""}
                          {!ok ? " - [품절]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ))}
            </div>
          )}

          {/* 수량 조절 및 총 금액 관제 박스 */}
          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">구매 수량</span>
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={decreaseQty}
                    disabled={soldOut || qty <= minVal}
                    className="flex h-9 w-9 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base select-none cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    name="qty"
                    min={minVal}
                    max={maxVal}
                    step={step}
                    value={qty}
                    disabled={soldOut}
                    onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="h-9 w-16 text-center text-sm font-bold text-slate-900 border-x border-slate-200 outline-hidden bg-white"
                  />
                  <button
                    type="button"
                    onClick={increaseQty}
                    disabled={soldOut || qty >= maxVal}
                    className="flex h-9 w-9 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base select-none cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right" data-line-total>
                <span className="text-xs font-medium text-slate-500 mr-2">총 결제금액</span>
                <b className="text-2xl font-black text-slate-900">{line.lineTotal.toLocaleString("ko-KR")}</b>
                <span className="text-sm font-bold text-slate-800 ml-0.5">원</span>
              </div>
            </div>

            {(moq > 1 || orderUnit > 1 || maxQty) && (
              <p className="mt-2.5 text-[11px] font-semibold text-blue-700 flex items-center gap-1.5" data-qty-rules>
                <span>ℹ️</span>
                <span>{[moq > 1 && `최소 ${moq}개 이상`, orderUnit > 1 && `${orderUnit}개 단위 주문`, maxQty && `1인 최대 ${maxQty}개`].filter(Boolean).join(" · ")}</span>
              </p>
            )}

            {!line.priceHidden && (ctx.tiers ?? []).length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs" data-tiers>
                <div className="font-bold text-blue-800 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>대량 구매 수량별 구간 할인</span>
                </div>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {(ctx.tiers ?? []).map((t) => (
                    <div key={t.min_qty} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-blue-100 text-slate-700 font-medium">
                      <span>{t.min_qty}개 이상 구매 시</span>
                      <strong className="text-blue-700 font-bold">
                        {t.discount_type === "rate" ? `${t.value}% 할인` : t.discount_type === "amount" ? `개당 -${t.value.toLocaleString("ko-KR")}원` : `개당 ${t.value.toLocaleString("ko-KR")}원`}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {line.errors[0] && <p className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">{line.errors[0]}</p>}

          {/* 장바구니 담기 3D 버튼 */}
          <button
            type="button"
            onClick={add}
            disabled={!line.orderable || pending}
            className="mt-6 min-h-13 w-full btn-3d-blue text-base font-bold tracking-tight disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{pending ? "장바구니 담는 중…" : "장바구니 담기"}</span>
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

      {/* 모바일 화면 하단 플로팅 구매 바 */}
      {showFloating && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/95 bg-white/95 px-4 py-3 backdrop-blur-md shadow-2xl sm:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">{name}</p>
              <p className="text-sm font-black text-slate-900">
                <b>{line.lineTotal.toLocaleString("ko-KR")}</b>원
                <span className="ml-1 text-[11px] font-normal text-slate-500">({qty}개)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={!line.orderable || pending}
              className="btn-3d-blue px-5 py-2.5 text-xs font-bold shadow-md disabled:opacity-40 cursor-pointer"
            >
              {pending ? "담는 중…" : "장바구니 담기"}
            </button>
          </div>
        </div>
      )}
    </>
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
        className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
        data-restock-open
      >
        <span>🔔</span>
        <span>재입고 알림 신청{variantId ? "(선택한 옵션)" : ""}</span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-xs" data-restock-box>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
          <span>🔔</span>
          <span>재입고 알림 신청{variantId ? " (선택 옵션)" : ""}</span>
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">
          ✕ 닫기
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">상품이 다시 입고되면 입력하신 번호로 문자 알림을 보내 드립니다.</p>
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-1234-5678"
        maxLength={13}
        className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
        data-restock-phone
      />
      <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-600 leading-snug cursor-pointer">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-blue-600" data-restock-agree />
        재입고 알림을 위해 핸드폰 번호를 수집·이용하는 데 동의합니다. (신청은 90일 후 만료)
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !agree || !phone.trim()}
        className="mt-3 min-h-10 w-full btn-3d-dark text-xs disabled:opacity-40 cursor-pointer"
        data-restock-submit
      >
        {pending ? "신청 등록 중…" : "알림 신청하기"}
      </button>
      {result && <p className={`mt-2 text-xs font-semibold ${result.ok ? "text-emerald-700" : "text-rose-600"}`} data-restock-message>{result.message}</p>}
    </div>
  );
}
