"use client";

import { useState } from "react";
import { findSourcingCandidatesAction } from "@/lib/actions/sourcing";
import { calcMargin, MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";
import type { AliexpressProduct } from "@/lib/aliexpress/client";

interface MarginPanelProps {
  keyword: string;
}

export function MarginPanel({ keyword }: MarginPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  async function handleOpen() {
    setIsOpen(true);
    if (products) return; // 이미 검색해봤으면 재검색하지 않음
    setIsSearching(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("keyword", keyword);
      const result = await findSourcingCandidatesAction(formData);
      if (result.error) {
        setError(result.error);
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

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="mt-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100"
      >
        🌏 알리 원가 비교
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-sky-900">🌏 &quot;{keyword}&quot; 알리익스프레스 원가 비교</p>
        <button onClick={() => setIsOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
          닫기
        </button>
      </div>

      {isSearching && <p className="text-xs text-gray-400">검색 중...</p>}
      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}

      {products && products.length === 0 && <p className="text-xs text-gray-400">검색된 상품이 없습니다.</p>}

      {products && products.length > 0 && !selected && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.productId}
              onClick={() => handleSelect(p)}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-sky-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="h-10 w-10 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500">
                  {p.salePriceKrw ? `${p.salePriceKrw.toLocaleString()}원` : "가격 정보 없음"}
                  {p.volume != null && ` · 판매량 ${p.volume.toLocaleString()}`}
                  {p.evaluateRate && ` · 평점 ${p.evaluateRate}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-white p-2">
            <p className="truncate text-xs text-gray-900">{selected.title}</p>
            <button onClick={() => setSelected(null)} className="shrink-0 text-xs text-sky-600 hover:underline">
              다른 상품 선택
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="text-gray-600">알리 원가(원)</span>
              <input
                type="number"
                value={selected.salePriceKrw ?? 0}
                readOnly
                className="w-full rounded border border-gray-200 bg-gray-100 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-gray-800">예상 판매가(원) *</span>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="예: 25000"
                className="w-full rounded border border-sky-300 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">관세율(%)</span>
              <input
                type="number"
                value={customsDutyRate}
                onChange={(e) => setCustomsDutyRate(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">부가세율(%)</span>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">개당 해외 운송비(원)</span>
              <input
                type="number"
                value={shippingPerUnit}
                onChange={(e) => setShippingPerUnit(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">국내 입고/검수비(원)</span>
              <input
                type="number"
                value={domesticFee}
                onChange={(e) => setDomesticFee(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">판매 플랫폼 수수료율(%)</span>
              <input
                type="number"
                value={platformFeeRate}
                onChange={(e) => setPlatformFeeRate(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-gray-600">택배비(원)</span>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-gray-600">개당 마케팅비(원, 선택)</span>
              <input
                type="number"
                value={marketingFee}
                onChange={(e) => setMarketingFee(e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1"
              />
            </label>
          </div>

          {marginResult && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                marginResult.marginRatePct >= 20
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : marginResult.marginRatePct >= 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p>
                최종 수입 단가(관세+부가세+운송+입고 포함): <span className="font-bold">{marginResult.landedCostKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-1">
                판매 수수료: <span className="font-bold">{marginResult.platformFeeKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-1">
                총 비용: <span className="font-bold">{marginResult.totalCostKrw.toLocaleString()}원</span>
              </p>
              <p className="mt-1 text-sm">
                예상 공헌이익:{" "}
                <span className="font-bold">
                  {marginResult.contributionProfitKrw.toLocaleString()}원 (마진율 {marginResult.marginRatePct}%)
                </span>
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
            세무사를 통해 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
