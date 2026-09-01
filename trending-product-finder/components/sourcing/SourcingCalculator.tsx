"use client";

import { useState } from "react";
import { findSourcingCandidatesAction, findDomeggookCandidatesAction } from "@/lib/actions/sourcing";
import { calcMargin, MARGIN_DEFAULTS, DOMESTIC_MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";

interface SourcingCalculatorProps {
  initialKeyword?: string;
}

type Platform = "aliexpress" | "domeggook";

interface NormalizedProduct {
  key: string;
  title: string;
  imageUrl: string;
  priceKrw: number | null;
  metaText: string;
}

const PLATFORMS: { value: Platform; label: string; description: string }[] = [
  { value: "aliexpress", label: "🌏 알리익스프레스 (해외)", description: "관세·부가세·해외운송비 반영" },
  { value: "domeggook", label: "🏠 도매매 (국내)", description: "통관 절차 없음, 최소구매수량 확인 필요" },
];

export function SourcingCalculator({ initialKeyword }: SourcingCalculatorProps) {
  const [platform, setPlatform] = useState<Platform>("aliexpress");
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<NormalizedProduct[] | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 계산기 입력값 — 전부 기본값을 미리 채워두고, 상품을 선택하지 않아도 바로 수정하며
  // 시뮬레이션할 수 있게 한다. 검색 후 상품을 고르면 "원가"/"예상 판매가"만
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

  function applyDefaults(defaults: typeof MARGIN_DEFAULTS) {
    setCustomsDutyRate(String(defaults.customsDutyRate));
    setVatRate(String(defaults.vatRate));
    setShippingPerUnit(String(defaults.shippingPerUnitKrw));
    setDomesticFee(String(defaults.domesticFeePerUnitKrw));
    setPlatformFeeRate(String(defaults.platformFeeRate));
    setDeliveryFee(String(defaults.deliveryFeeKrw));
    setMarketingFee(String(defaults.marketingFeeKrw));
  }

  function handlePlatformChange(next: Platform) {
    setPlatform(next);
    setProducts(null);
    setError(null);
    setSelectedTitle(null);
    setSelectedImage(null);
    applyDefaults(next === "aliexpress" ? MARGIN_DEFAULTS : DOMESTIC_MARGIN_DEFAULTS);
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!keyword.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("keyword", keyword.trim());

      if (platform === "aliexpress") {
        const result = await findSourcingCandidatesAction(formData);
        if (result.error) {
          setError(result.error);
          setProducts(null);
        } else {
          setProducts(
            (result.products ?? []).map((p) => ({
              key: p.productId,
              title: p.title,
              imageUrl: p.imageUrl,
              priceKrw: p.salePriceKrw,
              metaText: [
                p.volume != null ? `판매량 ${p.volume.toLocaleString()}` : null,
                p.evaluateRate ? `평점 ${p.evaluateRate}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
            })),
          );
        }
      } else {
        const result = await findDomeggookCandidatesAction(formData);
        if (result.error) {
          setError(result.error);
          setProducts(null);
        } else {
          setProducts(
            (result.products ?? []).map((p) => ({
              key: p.itemNo,
              title: p.title,
              imageUrl: p.thumbUrl,
              priceKrw: p.priceKrw,
              metaText: [
                p.minOrderQty != null ? `최소구매수량 ${p.minOrderQty.toLocaleString()}개` : null,
                p.sellerId ? `판매자 ${p.sellerId}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
            })),
          );
        }
      }
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelect(product: NormalizedProduct) {
    setSelectedTitle(product.title);
    setSelectedImage(product.imageUrl || null);
    if (product.priceKrw) {
      setSourcePrice(String(product.priceKrw));
      setSellingPrice(String(Math.round(product.priceKrw * 2.5)));
    }
    // 이전에 직접 수정했던 값이 남아있지 않도록, 상품을 새로 선택할 때마다
    // 나머지 비용 항목도 전부 (플랫폼에 맞는) 기본값으로 되돌려서 다시 채운다.
    applyDefaults(platform === "aliexpress" ? MARGIN_DEFAULTS : DOMESTIC_MARGIN_DEFAULTS);
  }

  function handleReset() {
    // 선택 정보만 지우면 값은 이미 수정 가능한 상태라 버튼이 의미가 없어진다.
    // "직접입력"이 실제로 다른 동작을 하도록 자동 채워졌던 원가/판매가도 함께 비운다.
    setSelectedTitle(null);
    setSelectedImage(null);
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

  const isDomestic = platform === "domeggook";

  return (
    <div className="space-y-4">
      {/* 소싱 채널 선택 */}
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePlatformChange(p.value)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              platform === p.value
                ? "border-sky-400 bg-sky-50"
                : "border-gray-200 bg-white hover:border-sky-200"
            }`}
          >
            <p className={`text-sm font-bold ${platform === p.value ? "text-sky-700" : "text-gray-800"}`}>
              {p.label}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
          </button>
        ))}
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

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {products && products.length === 0 && (
        <p className="text-sm text-gray-400">검색된 상품이 없습니다. 다른 키워드로 시도해보세요.</p>
      )}

      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map((p) => (
            <button
              key={p.key}
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
                  {p.priceKrw ? `${p.priceKrw.toLocaleString()}원` : "가격 정보 없음"}
                  {p.metaText && ` · ${p.metaText}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  selectedTitle === p.title
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-600 text-white"
                }`}
              >
                {selectedTitle === p.title ? "✅ 선택됨" : "상품 선택"}
              </span>
            </button>
          ))}
        </div>
      )}

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
            <p className="truncate text-xs text-gray-700">{selectedTitle}</p>
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
                국내 소싱(도매매)이라 관세·부가세·해외운송비는 기본 0원으로 채워집니다.
              </span>
            </>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-800">{isDomestic ? "도매매 원가(원) *" : "알리 원가(원) *"}</span>
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
            <span className="text-xs text-gray-600">
              관세율(%) — 기본 {isDomestic ? DOMESTIC_MARGIN_DEFAULTS.customsDutyRate : MARGIN_DEFAULTS.customsDutyRate}%
              {isDomestic && " (국내소싱)"}
            </span>
            <input
              type="number"
              value={customsDutyRate}
              onChange={(e) => setCustomsDutyRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              부가세율(%) — 기본 {isDomestic ? DOMESTIC_MARGIN_DEFAULTS.vatRate : MARGIN_DEFAULTS.vatRate}%
              {isDomestic && " (국내소싱)"}
            </span>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="input-sm w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-600">
              개당 해외 운송비(원) — 기본{" "}
              {(isDomestic ? DOMESTIC_MARGIN_DEFAULTS.shippingPerUnitKrw : MARGIN_DEFAULTS.shippingPerUnitKrw).toLocaleString()}
              원{isDomestic && " (국내소싱)"}
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
                    <span>{isDomestic ? "도매매 원가" : "알리 원가"}</span>
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
