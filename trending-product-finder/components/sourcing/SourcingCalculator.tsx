"use client";

import { useState } from "react";
import {
  findSourcingCandidatesAction,
  findDomeggookCandidatesAction,
  findElevenstCandidatesAction,
} from "@/lib/actions/sourcing";
import { calcMargin, MARGIN_DEFAULTS, DOMESTIC_MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";

interface SourcingCalculatorProps {
  initialKeyword?: string;
}

type Platform = "aliexpress" | "domeggook" | "elevenst";

// 도매매/11번가는 국내 소싱이라 통관 절차가 없다 — 관세/부가세/해외운송비 기본값을
// 0원으로 채우는 대상 채널.
const DOMESTIC_PLATFORMS: Platform[] = ["domeggook", "elevenst"];

interface NormalizedProduct {
  key: string;
  platform: Platform;
  title: string;
  imageUrl: string;
  priceKrw: number | null;
  metaText: string;
  detailUrl: string;
}

interface PlatformResult {
  products: NormalizedProduct[];
  error?: string;
  translatedKeyword?: string;
  warning?: string;
}

const PLATFORMS: { value: Platform; label: string; description: string }[] = [
  { value: "aliexpress", label: "🌏 알리익스프레스 (해외)", description: "관세·부가세·해외운송비 반영" },
  { value: "domeggook", label: "🏠 도매매 (국내)", description: "통관 절차 없음, 최소구매수량 확인 필요" },
  { value: "elevenst", label: "🏪 11번가 (국내)", description: "통관 절차 없음, 오픈마켓 실판매가 비교" },
];

async function fetchAliexpress(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findSourcingCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.productId,
      platform: "aliexpress" as const,
      title: p.title,
      imageUrl: p.imageUrl,
      priceKrw: p.salePriceKrw,
      metaText: [
        p.volume != null ? `판매량 ${p.volume.toLocaleString()}` : null,
        p.evaluateRate ? `평점 ${p.evaluateRate}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detailUrl: p.detailUrl,
    })),
    translatedKeyword: result.translatedKeyword,
    warning: result.warning,
  };
}

async function fetchDomeggook(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findDomeggookCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.itemNo,
      platform: "domeggook" as const,
      title: p.title,
      imageUrl: p.thumbUrl,
      priceKrw: p.priceKrw,
      metaText: [
        p.minOrderQty != null ? `최소구매수량 ${p.minOrderQty.toLocaleString()}개` : null,
        p.sellerId ? `판매자 ${p.sellerId}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detailUrl: p.detailUrl,
    })),
  };
}

async function fetchElevenst(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findElevenstCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.productCode,
      platform: "elevenst" as const,
      title: p.title,
      imageUrl: p.imageUrl,
      priceKrw: p.salePriceKrw ?? p.priceKrw,
      metaText: p.seller ? `판매자 ${p.seller}` : "",
      detailUrl: p.detailUrl,
    })),
  };
}

const FETCHERS: Record<Platform, (keyword: string) => Promise<PlatformResult>> = {
  aliexpress: fetchAliexpress,
  domeggook: fetchDomeggook,
  elevenst: fetchElevenst,
};

export function SourcingCalculator({ initialKeyword }: SourcingCalculatorProps) {
  // 토글(단일 선택) 대신 체크박스로 여러 채널을 동시에 선택해서, 검색 한 번으로
  // 알리익스프레스/도매매 결과를 채널별로 나눠 보고 그 안에서 상품을 고를 수 있게 한다.
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set<Platform>(["aliexpress"]));
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Record<Platform, PlatformResult | null>>({
    aliexpress: null,
    domeggook: null,
    elevenst: null,
  });
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  // 계산기 입력값 — 전부 기본값을 미리 채워두고, 상품을 선택하지 않아도 바로 수정하며
  // 시뮬레이션할 수 있게 한다. 검색 후 상품을 고르면 원가/예상 판매가만 자동으로
  // 채워주고, 나머지 값은 계속 자유롭게 조정 가능하다.
  const [sourcePrice, setSourcePrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [customsDutyRate, setCustomsDutyRate] = useState(String(MARGIN_DEFAULTS.customsDutyRate));
  const [vatRate, setVatRate] = useState(String(MARGIN_DEFAULTS.vatRate));
  const [shippingPerUnit, setShippingPerUnit] = useState(String(MARGIN_DEFAULTS.shippingPerUnitKrw));
  const [domesticFee, setDomesticFee] = useState(String(MARGIN_DEFAULTS.domesticFeePerUnitKrw));
  const [platformFeeRate, setPlatformFeeRate] = useState(String(MARGIN_DEFAULTS.platformFeeRate));
  const [deliveryFee, setDeliveryFee] = useState(String(MARGIN_DEFAULTS.deliveryFeeKrw));
  const [marketingFee, setMarketingFee] = useState(String(MARGIN_DEFAULTS.marketingFeeKrw));

  function applyDefaults(defaults: typeof MARGIN_DEFAULTS) {
    setCustomsDutyRate(String(defaults.customsDutyRate));
    setVatRate(String(defaults.vatRate));
    setShippingPerUnit(String(defaults.shippingPerUnitKrw));
    setDomesticFee(String(defaults.domesticFeePerUnitKrw));
    setPlatformFeeRate(String(defaults.platformFeeRate));
    setDeliveryFee(String(defaults.deliveryFeeKrw));
    setMarketingFee(String(defaults.marketingFeeKrw));
  }

  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev; // 최소 1개는 선택되어 있어야 한다
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!keyword.trim() || selectedPlatforms.size === 0) return;
    setIsSearching(true);
    try {
      const targets = Array.from(selectedPlatforms);
      const entries = await Promise.all(targets.map(async (p) => [p, await FETCHERS[p](keyword.trim())] as const));
      const next: Record<Platform, PlatformResult | null> = { aliexpress: null, domeggook: null, elevenst: null };
      for (const [p, r] of entries) next[p] = r;
      setResults(next);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelect(product: NormalizedProduct) {
    setSelectedTitle(product.title);
    setSelectedImage(product.imageUrl || null);
    setSelectedPlatform(product.platform);
    if (product.priceKrw) {
      setSourcePrice(String(product.priceKrw));
      setSellingPrice(String(Math.round(product.priceKrw * 2.5)));
    }
    // 이전에 직접 수정했던 값이 남아있지 않도록, 상품을 새로 선택할 때마다
    // 나머지 비용 항목도 전부 (선택한 상품의 채널에 맞는) 기본값으로 되돌려서 다시 채운다.
    applyDefaults(DOMESTIC_PLATFORMS.includes(product.platform) ? DOMESTIC_MARGIN_DEFAULTS : MARGIN_DEFAULTS);
  }

  function handleReset() {
    // 선택 정보만 지우면 값은 이미 수정 가능한 상태라 버튼이 의미가 없어진다.
    // "직접입력"이 실제로 다른 동작을 하도록 자동 채워졌던 원가/판매가도 함께 비운다.
    setSelectedTitle(null);
    setSelectedImage(null);
    setSelectedPlatform(null);
    setSourcePrice("");
    setSellingPrice("");
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

  const isDomestic = selectedPlatform != null && DOMESTIC_PLATFORMS.includes(selectedPlatform);
  const activeDefaults = isDomestic ? DOMESTIC_MARGIN_DEFAULTS : MARGIN_DEFAULTS;

  return (
    <div className="space-y-4">
      {/* 소싱 채널 선택 — 중복 선택 가능, 선택한 채널 결과를 한 번에 나눠서 보여준다 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const checked = selectedPlatforms.has(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePlatform(p.value)}
              aria-pressed={checked}
              className={`flex items-start gap-2 rounded-2xl border p-3 text-left transition-colors ${
                checked ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-white hover:border-sky-200"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-sky-600 bg-sky-600 text-white" : "border-gray-300 bg-white"
                }`}
              >
                {checked && "✓"}
              </span>
              <span>
                <p className={`text-sm font-bold ${checked ? "text-sky-700" : "text-gray-800"}`}>{p.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
              </span>
            </button>
          );
        })}
      </div>

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

      {/* 채널별 검색 결과 — 선택한 채널마다 구분해서 보여주고, 그 안에서 상품을 고른다 */}
      {PLATFORMS.filter((p) => selectedPlatforms.has(p.value) && results[p.value]).map((p) => {
        const result = results[p.value]!;
        return (
          <div key={p.value} className="space-y-2">
            <p className="text-xs font-bold text-gray-500">{p.label} 검색결과</p>
            {result.translatedKeyword && (
              <p className="text-xs text-gray-400">
                알리익스프레스는 한글 검색어를 잘 인식하지 못해, 실제 검색어를{" "}
                <span className="font-semibold text-gray-600">&quot;{result.translatedKeyword}&quot;</span>(영어)로
                자동 번역해서 검색했습니다.
              </p>
            )}
            {result.warning && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⚠️ {result.warning}</p>
            )}
            {result.error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{result.error}</p>}
            {!result.error && result.products.length === 0 && (
              <p className="text-sm text-gray-400">검색된 상품이 없습니다. 다른 키워드로 시도해보세요.</p>
            )}
            {result.products.map((prod) => {
              const isSelected = selectedTitle === prod.title && selectedPlatform === prod.platform;
              return (
                <div
                  key={prod.key}
                  className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 ${
                    isSelected ? "border-sky-400 bg-sky-50" : "border-gray-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {prod.imageUrl && <img src={prod.imageUrl} alt={prod.title} className="h-14 w-14 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">{prod.title}</p>
                    <p className="text-xs text-gray-500">
                      {prod.priceKrw ? `${prod.priceKrw.toLocaleString()}원` : "가격 정보 없음"}
                      {prod.metaText && ` · ${prod.metaText}`}
                    </p>
                  </div>
                  {prod.detailUrl && (
                    <a
                      href={prod.detailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      🔗 상품 보기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(prod)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      isSelected ? "bg-emerald-100 text-emerald-700" : "bg-sky-600 text-white hover:bg-sky-700"
                    }`}
                  >
                    {isSelected ? "✅ 선택됨" : "상품 선택"}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="space-y-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">💰 마진 계산기</p>
          {selectedTitle && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
            >
              직접입력
            </button>
          )}
        </div>

        {selectedTitle && (
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {selectedImage && <img src={selectedImage} alt={selectedTitle} className="h-10 w-10 rounded object-cover" />}
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-700">{selectedTitle}</p>
              <p className="text-[11px] text-gray-400">
                {PLATFORMS.find((p) => p.value === selectedPlatform)?.label}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          아래 값은 모두 <span className="font-semibold text-gray-700">기본 추정치가 미리 채워져</span> 있습니다.
          <br />
          위에서 상품을 검색·선택하면 원가/예상 판매가만 자동으로 채워지고,
          <br />
          다른 값은 수정시 즉시 다시 계산됩니다.
          {isDomestic && (
            <>
              <br />
              <span className="font-semibold text-emerald-700">
                국내 소싱(도매매/11번가) 상품이라 관세·부가세·해외운송비는 기본 0원으로 채워집니다.
              </span>
            </>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-800">원가(원) *</span>
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
            <span className="text-xs text-gray-600">관세율(%) — 기본 {activeDefaults.customsDutyRate}%</span>
            <input
              type="number"
              value={customsDutyRate}
              onChange={(e) => setCustomsDutyRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">부가세율(%) — 기본 {activeDefaults.vatRate}%</span>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              개당 해외 운송비(원) — 기본 {activeDefaults.shippingPerUnitKrw.toLocaleString()}원
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

        {(() => {
          const dutyAndVatKrw = Math.round(
            (Number(sourcePrice) || 0) * ((Number(customsDutyRate) || 0) + (Number(vatRate) || 0)) / 100,
          );
          const tone =
            marginResult.marginRatePct >= 20
              ? { badge: "bg-emerald-600", box: "border-emerald-200 bg-emerald-50", text: "text-emerald-900" }
              : marginResult.marginRatePct >= 0
                ? { badge: "bg-amber-500", box: "border-amber-200 bg-amber-50", text: "text-amber-900" }
                : { badge: "bg-red-600", box: "border-red-200 bg-red-50", text: "text-red-900" };

          return (
            <div className={`rounded-xl border ${tone.box} overflow-hidden`}>
              {/* 핵심 결과 — 한눈에 보이는 요약 */}
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className={`text-xs font-semibold ${tone.text} opacity-80`}>개당 예상 마진(수익)</p>
                  <p className={`text-2xl font-extrabold tabular-nums ${tone.text}`}>
                    {marginResult.contributionProfitKrw.toLocaleString()}원
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full ${tone.badge} px-4 py-1.5 text-sm font-bold text-white tabular-nums`}
                >
                  마진율 {marginResult.marginRatePct}%
                </span>
              </div>

              {/* 계산 과정 상세 — 영수증 형태로 항목별 표시 */}
              <div className="border-t border-black/5 bg-white/60 px-4 py-3 text-sm">
                <p className="mb-1.5 text-xs font-bold text-gray-500">최종 수입 단가 계산</p>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>원가</span>
                    <span className="tabular-nums">{(Number(sourcePrice) || 0).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 관세·부가세 ({(Number(customsDutyRate) || 0) + (Number(vatRate) || 0)}%)</span>
                    <span className="tabular-nums">{dutyAndVatKrw.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 해외 운송비</span>
                    <span className="tabular-nums">{(Number(shippingPerUnit) || 0).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 국내 입고/검수비</span>
                    <span className="tabular-nums">{(Number(domesticFee) || 0).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 font-bold text-gray-900">
                    <span>= 최종 수입 단가</span>
                    <span className="tabular-nums">{marginResult.landedCostKrw.toLocaleString()}원</span>
                  </div>
                </div>

                <p className="mb-1.5 mt-3 text-xs font-bold text-gray-500">판매 비용 + 최종 결과</p>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>최종 수입 단가</span>
                    <span className="tabular-nums">{marginResult.landedCostKrw.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 플랫폼 수수료 ({platformFeeRate || 0}%)</span>
                    <span className="tabular-nums">{marginResult.platformFeeKrw.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 택배비</span>
                    <span className="tabular-nums">{(Number(deliveryFee) || 0).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 마케팅비</span>
                    <span className="tabular-nums">{(Number(marketingFee) || 0).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 font-bold text-gray-900">
                    <span>= 총 비용</span>
                    <span className="tabular-nums">{marginResult.totalCostKrw.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>예상 판매가</span>
                    <span className="tabular-nums">{(Number(sellingPrice) || 0).toLocaleString()}원</span>
                  </div>
                  <div className={`flex justify-between border-t border-gray-300 pt-1 text-base font-extrabold ${tone.text}`}>
                    <span>= 마진(수익)</span>
                    <span className="tabular-nums">{marginResult.contributionProfitKrw.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <p className="text-xs text-gray-400">
          ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
          세무사를 통해 확인해주세요.
        </p>
      </div>
    </div>
  );
}
