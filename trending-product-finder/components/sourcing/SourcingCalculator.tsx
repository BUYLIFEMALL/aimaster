"use client";

import { useState } from "react";
import { findSourcingCandidatesAction } from "@/lib/actions/sourcing";
import { calcMargin, MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";
import type { AliexpressProduct } from "@/lib/aliexpress/client";

interface SourcingCalculatorProps {
  initialKeyword?: string;
}

export function SourcingCalculator({ initialKeyword }: SourcingCalculatorProps) {
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<AliexpressProduct[] | null>(null);
  const [selected, setSelected] = useState<AliexpressProduct | null>(null);

  const [sellingPrice, setSellingPrice] = useState("");
  const [customsDutyRate, setCustomsDutyRate] = useState(String(MARGIN_DEFAULTS.customsDutyRate));
  const [vatRate, setVatRate] = useState(String(MARGIN_DEFAULTS.vatRate));
  const [shippingPerUnit, setShippingPerUnit] = useState(String(MARGIN_DEFAULTS.shippingPerUnitKrw));
  const [domesticFee, setDomesticFee] = useState(String(MARGIN_DEFAULTS.domesticFeePerUnitKrw));
  const [platformFeeRate, setPlatformFeeRate] = useState(String(MARGIN_DEFAULTS.platformFeeRate));
  const [deliveryFee, setDeliveryFee] = useState(String(MARGIN_DEFAULTS.deliveryFeeKrw));
  const [marketingFee, setMarketingFee] = useState(String(MARGIN_DEFAULTS.marketingFeeKrw));

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!keyword.trim()) return;
    setIsSearching(true);
    setError(null);
    setSelected(null);
    try {
      const formData = new FormData();
      formData.set("keyword", keyword.trim());
      const result = await findSourcingCandidatesAction(formData);
      if (result.error) {
        setError(result.error);
        setProducts(null);
      } else {
        setProducts(result.products ?? []);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelect(product: AliexpressProduct) {
    setSelected(product);
    if (product.salePriceKrw) {
      setSellingPrice(String(Math.round(product.salePriceKrw * 2.5)));
    }
  }

  let marginResult: MarginResult | null = null;
  if (selected?.salePriceKrw && sellingPrice) {
    marginResult = calcMargin({
      sourcePriceKrw: selected.salePriceKrw,
      customsDutyRate: Number(customsDutyRate) || 0,
      vatRate: Number(vatRate) || 0,
      shippingPerUnitKrw: Number(shippingPerUnit) || 0,
      domesticFeePerUnitKrw: Number(domesticFee) || 0,
      platformFeeRate: Number(platformFeeRate) || 0,
      deliveryFeeKrw: Number(deliveryFee) || 0,
      marketingFeeKrw: Number(marketingFee) || 0,
      sellingPriceKrw: Number(sellingPrice) || 0,
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="소싱 원가를 비교할 키워드 (예: 무선청소기)"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {isSearching ? "검색 중..." : "검색"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {products && products.length === 0 && (
        <p className="text-sm text-gray-400">검색된 상품이 없습니다. 다른 키워드로 시도해보세요.</p>
      )}

      {products && products.length > 0 && !selected && (
        <div className="space-y-2">
          {products.map((p) => (
            <button
              key={p.productId}
              onClick={() => handleSelect(p)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-sky-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="h-14 w-14 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500">
                  {p.salePriceKrw ? `${p.salePriceKrw.toLocaleString()}원` : "가격 정보 없음"}
                  {p.volume != null && ` · 판매량 ${p.volume.toLocaleString()}`}
                  {p.evaluateRate && ` · 평점 ${p.evaluateRate}`}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                이 상품으로 계산
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt={selected.title} className="h-10 w-10 rounded object-cover" />
              )}
              <p className="truncate text-sm text-gray-900">{selected.title}</p>
            </div>
            <button onClick={() => setSelected(null)} className="shrink-0 text-xs text-sky-600 hover:underline">
              다른 상품 선택
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-gray-600">알리 원가(원)</span>
              <input
                type="number"
                value={selected.salePriceKrw ?? 0}
                readOnly
                className="input-sm w-full bg-gray-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-800">예상 판매가(원) *</span>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="예: 25000"
                className="input-sm w-full border-sky-300"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">관세율(%)</span>
              <input
                type="number"
                value={customsDutyRate}
                onChange={(e) => setCustomsDutyRate(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">부가세율(%)</span>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">개당 해외 운송비(원)</span>
              <input
                type="number"
                value={shippingPerUnit}
                onChange={(e) => setShippingPerUnit(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">국내 입고/검수비(원)</span>
              <input
                type="number"
                value={domesticFee}
                onChange={(e) => setDomesticFee(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">판매 플랫폼 수수료율(%)</span>
              <input
                type="number"
                value={platformFeeRate}
                onChange={(e) => setPlatformFeeRate(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">택배비(원)</span>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="input-sm w-full"
              />
            </label>
            <label className="col-span-2 space-y-1">
              <span className="text-xs text-gray-600">개당 마케팅비(원, 선택)</span>
              <input
                type="number"
                value={marketingFee}
                onChange={(e) => setMarketingFee(e.target.value)}
                className="input-sm w-full"
              />
            </label>
          </div>

          {marginResult && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                marginResult.marginRatePct >= 20
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : marginResult.marginRatePct >= 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p>
                최종 수입 단가(관세+부가세+운송+입고 포함):{" "}
                <span className="font-bold">{marginResult.landedCostKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-1">
                판매 수수료: <span className="font-bold">{marginResult.platformFeeKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-1">
                총 비용: <span className="font-bold">{marginResult.totalCostKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-2 text-base">
                예상 공헌이익:{" "}
                <span className="font-bold">
                  {marginResult.contributionProfitKrw.toLocaleString()}원 (마진율 {marginResult.marginRatePct}%)
                </span>
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400">
            ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
            세무사를 통해 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
