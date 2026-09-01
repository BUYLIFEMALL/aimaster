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
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 계산기 입력값 — 전부 기본값을 미리 채워두고, 상품을 선택하지 않아도 바로 수정하며
  // 시뮬레이션할 수 있게 한다. 검색 후 상품을 고르면 "알리 원가"/"예상 판매가"만
  // 자동으로 채워주고, 나머지 값은 계속 자유롭게 조정 가능하다.
  const [sourcePrice, setSourcePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
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
    setSelectedTitle(product.title);
    setSelectedImage(product.imageUrl || null);
    if (product.salePriceKrw) {
      setSourcePrice(String(product.salePriceKrw));
      setSellingPrice(String(Math.round(product.salePriceKrw * 2.5)));
    }
  }

  function handleReset() {
    setSelectedTitle(null);
    setSelectedImage(null);
  }

  const marginResult: MarginResult = calcMargin({
    sourcePriceKrw: Number(sourcePrice) || 0,
    customsDutyRate: Number(customsDutyRate) || 0,
    vatRate: Number(vatRate) || 0,
    shippingPerUnitKrw: Number(shippingPerUnit) || 0,
    domesticFeePerUnitKrw: Number(domesticFee) || 0,
    platformFeeRate: Number(platformFeeRate) || 0,
    deliveryFeeKrw: Number(deliveryFee) || 0,
    marketingFeeKrw: Number(marketingFee) || 0,
    sellingPriceKrw: Number(sellingPrice) || 0,
  });

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="소싱 원가를 비교할 키워드 (예: 무선청소기) — 검색 없이 아래 계산기만 바로 써도 됩니다"
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

      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map((p) => (
            <button
              key={p.productId}
              onClick={() => handleSelect(p)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left hover:border-sky-300 ${
                selectedTitle === p.title ? "border-sky-400 bg-sky-50" : "border-gray-200"
              }`}
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
                {selectedTitle === p.title ? "✅ 선택됨" : "이 값으로 채우기"}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">💰 마진 계산기</p>
          {selectedTitle && (
            <button onClick={handleReset} className="text-xs text-sky-600 hover:underline">
              선택 해제하고 직접 입력
            </button>
          )}
        </div>

        {selectedTitle && (
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {selectedImage && <img src={selectedImage} alt={selectedTitle} className="h-10 w-10 rounded object-cover" />}
            <p className="truncate text-xs text-gray-700">{selectedTitle}</p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          아래 값은 모두 <span className="font-semibold text-gray-700">기본 추정치가 미리 채워져</span> 있습니다.
          위에서 상품을 검색·선택하면 알리 원가/예상 판매가만 자동으로 채워지고, 그 외에는 언제든
          직접 수정해서 즉시 다시 계산됩니다.
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-800">알리 원가(원) *</span>
            <input
              type="number"
              value={sourcePrice}
              onChange={(e) => setSourcePrice(e.target.value)}
              className="input-sm w-full border-sky-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-800">예상 판매가(원) *</span>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="input-sm w-full border-sky-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">관세율(%) — 기본 {MARGIN_DEFAULTS.customsDutyRate}%</span>
            <input
              type="number"
              value={customsDutyRate}
              onChange={(e) => setCustomsDutyRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">부가세율(%) — 기본 {MARGIN_DEFAULTS.vatRate}%</span>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              개당 해외 운송비(원) — 기본 {MARGIN_DEFAULTS.shippingPerUnitKrw.toLocaleString()}원
            </span>
            <input
              type="number"
              value={shippingPerUnit}
              onChange={(e) => setShippingPerUnit(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              국내 입고/검수비(원) — 기본 {MARGIN_DEFAULTS.domesticFeePerUnitKrw.toLocaleString()}원
            </span>
            <input
              type="number"
              value={domesticFee}
              onChange={(e) => setDomesticFee(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              판매 플랫폼 수수료율(%) — 기본 {MARGIN_DEFAULTS.platformFeeRate}%
            </span>
            <input
              type="number"
              value={platformFeeRate}
              onChange={(e) => setPlatformFeeRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              택배비(원) — 기본 {MARGIN_DEFAULTS.deliveryFeeKrw.toLocaleString()}원
            </span>
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

        <p className="text-xs text-gray-400">
          ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
          세무사를 통해 확인해주세요.
        </p>
      </div>
    </div>
  );
}
