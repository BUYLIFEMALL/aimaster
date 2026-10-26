"use client";
import { useEffect, useState } from "react";
import { shopDetailPageUrl } from "@/lib/shopDetailLink";
// v1.10: SourcingCalculator에서 분리 — 💰 마진 계산기(입력칸 + 영수증 형태 결과). 화면·계산식은 이전과 같다.
import { calcMargin, MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";
// v1.27(E1): 마켓별 정산 공식 — 공용 기준 코드 market-fees 사본(lib/marketFees.ts, 직접 고치지 말 것)
import { MARKET_LABELS, calcMarketMargin, compareMarkets, priceForMargin, type MarketId, type MarketMarginInput, type ShippingMode } from "@/lib/marketFees";
import { MarketSalesSection } from "./MarketSalesSection";
import { readFlowActive } from "@/components/ShopFlowBar";
import { defaultsFor, isDomesticPlatform, platformLabel, type Platform } from "@/lib/sourcingResults";
import { FX_CURRENCIES, FX_LABELS, toKrw, type CustomsFxSnapshot, type FxCurrency } from "@/lib/customs/fxParse";

/** 계산기 입력값(입력칸 그대로의 문자열) */
export interface MarginForm {
  sourcePrice: string;
  sellingPrice: string;
  customsDutyRate: string;
  vatRate: string;
  shippingPerUnit: string;
  domesticFee: string;
  platformFeeRate: string;
  deliveryFee: string;
  marketingFee: string;
  /** 판매 마켓 — 빈 값이면 예전처럼 수수료 한 칸만 쓰는 「직접 입력」 */
  market: MarketId | "";
  category: string;
  shippingMode: ShippingMode;
  shippingCharge: string;
  sellerDiscount: string;
  extraFee: string;
  packCost: string;
  monthlyFixed: string;
  monthlyQty: string;
  targetMargin: string;
}

/** 판매 마켓·정산 설정 — 상품을 바꿔 골라도 유지된다 */
export const SALES_FIELDS_DEFAULT: Pick<MarginForm, "market" | "category" | "shippingMode" | "shippingCharge" | "sellerDiscount" | "extraFee" | "packCost" | "monthlyFixed" | "monthlyQty" | "targetMargin"> = {
  market: "",
  category: "",
  shippingMode: "free",
  shippingCharge: "3000",
  sellerDiscount: "0",
  extraFee: "0",
  packCost: "0",
  monthlyFixed: "0",
  monthlyQty: "",
  targetMargin: "20",
};

/** 채널 기본값으로 원가·판매가를 제외한 비용 칸을 채운다 */
export type CostFields = Pick<MarginForm, "customsDutyRate" | "vatRate" | "shippingPerUnit" | "domesticFee" | "platformFeeRate" | "deliveryFee" | "marketingFee">;
export function costFieldsFrom(defaults: typeof MARGIN_DEFAULTS): CostFields {
  return {
    customsDutyRate: String(defaults.customsDutyRate),
    vatRate: String(defaults.vatRate),
    shippingPerUnit: String(defaults.shippingPerUnitKrw),
    domesticFee: String(defaults.domesticFeePerUnitKrw),
    platformFeeRate: String(defaults.platformFeeRate),
    deliveryFee: String(defaults.deliveryFeeKrw),
    marketingFee: String(defaults.marketingFeeKrw),
  };
}

// 계산기 입력값 — 전부 기본값을 미리 채워두고, 상품을 선택하지 않아도 바로 수정하며
// 시뮬레이션할 수 있게 한다.
export const INITIAL_MARGIN_FORM: MarginForm = { sourcePrice: "0", sellingPrice: "0", ...costFieldsFrom(MARGIN_DEFAULTS), ...SALES_FIELDS_DEFAULT };

/** 마켓 계산 입력(최종 원가는 기존 계산의 수입 단가를 그대로 쓴다). 직접 입력이면 market "other"·무료배송으로 예전 계산과 같아진다. */
export function marketInputOf(form: MarginForm, landedCostKrw: number): MarketMarginInput {
  const num = (v: string) => Number(v) || 0;
  const manual = form.market === "";
  const market: MarketId = form.market === "" ? "other" : form.market;
  return {
    market,
    sellingPrice: num(form.sellingPrice),
    sellerDiscount: manual ? 0 : num(form.sellerDiscount),
    feePct: num(form.platformFeeRate),
    extraFeePct: manual ? 0 : num(form.extraFee),
    shippingMode: manual ? "free" : form.shippingMode,
    shippingCharge: num(form.shippingCharge),
    shippingFeePct: manual ? 0 : undefined,
    courierCost: num(form.deliveryFee),
    unitCost: landedCostKrw,
    packCost: manual ? 0 : num(form.packCost),
    adCost: num(form.marketingFee),
    monthlyFixed: manual ? 0 : num(form.monthlyFixed),
    monthlyQty: manual ? 0 : num(form.monthlyQty),
  };
}

export function marginOf(form: MarginForm): MarginResult {
  return calcMargin({
    sourcePriceKrw: Number(form.sourcePrice) || 0,
    customsDutyRate: Number(form.customsDutyRate) || 0,
    vatRate: Number(form.vatRate) || 0,
    shippingPerUnitKrw: Number(form.shippingPerUnit) || 0,
    domesticFeePerUnitKrw: Number(form.domesticFee) || 0,
    platformFeeRate: Number(form.platformFeeRate) || 0,
    deliveryFeeKrw: Number(form.deliveryFee) || 0,
    marketingFeeKrw: Number(form.marketingFee) || 0,
    sellingPriceKrw: Number(form.sellingPrice) || 0,
  });
}

interface Props {
  form: MarginForm;
  onChange: (field: keyof MarginForm, value: string) => void;
  selectedTitle: string | null;
  selectedImage: string | null;
  selectedPlatform: Platform | null;
  selectedDetailUrl: string;
  onReset: () => void;
  /** EC-W7: 관세청 과세환율 */
  customsFx?: CustomsFxSnapshot;
}

export function MarginCalculatorPanel({
  form,
  onChange,
  selectedTitle,
  selectedImage,
  selectedPlatform,
  selectedDetailUrl,
  onReset,
  customsFx,
}: Props) {
  const marginResult = marginOf(form);
  // v1.27(E1): 마켓을 고르면 마켓 정산 공식(배송 방식·할인·추가 수수료·포장비·월 고정비)으로 이익을 낸다.
  const isMarket = form.market !== "";
  const marketInput = marketInputOf(form, marginResult.landedCostKrw);
  const marketResult = calcMarketMargin(marketInput);
  const profit = isMarket ? marketResult.profit : marginResult.contributionProfitKrw;
  const marginPct = isMarket ? marketResult.marginPct : marginResult.marginRatePct;
  const breakEven = priceForMargin(marketInput, 0);
  const targetPct = Number(form.targetMargin) || 0;
  const targetPrice = priceForMargin(marketInput, targetPct);
  const [showCompare, setShowCompare] = useState(false);
  // E9: 흐름 여부는 화면이 뜬 뒤 읽는다(서버에서 그린 링크와 어긋나지 않게)
  const [inFlow, setInFlow] = useState(false);
  useEffect(() => setInFlow(readFlowActive()), []);
  // v1.23(추가): 선택 기능 — 추천판매가를 상세페이지 「정상가」로 함께 넘길지(할인가로는 넘기지 않음).
  const [passPrice, setPassPrice] = useState(true);
  const isDomestic = isDomesticPlatform(selectedPlatform);
  const activeDefaults = defaultsFor(selectedPlatform);
  const num = (v: string) => Number(v) || 0;

  const tone =
    marginPct >= 20
      ? { badge: "bg-[#047857]", box: "border-mx-success/30 bg-mx-success/10", text: "text-[#a7f3d0]" }
      : marginPct >= 0
        ? { badge: "bg-mx-accent", box: "border-mx-accent/30 bg-mx-accent/10", text: "text-[#fde68a]" }
        : { badge: "bg-mx-danger", box: "border-mx-danger/30 bg-mx-danger/10", text: "text-[#fecdd3]" };

  return (
    <div className="space-y-3 bg-mx-surface border border-mx-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-mx-text">💰 마진 계산기</p>
        {selectedTitle && (
          <button
            onClick={onReset}
            className="rounded-lg border border-mx-primary/40 bg-mx-primary/10 px-3 py-1.5 text-xs font-bold text-mx-link hover:bg-mx-primary/20"
          >
            직접입력
          </button>
        )}
      </div>

      {selectedTitle && (
        <div className="flex items-center gap-3 rounded-lg bg-mx-raised p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {selectedImage && <img src={selectedImage} alt={selectedTitle} className="h-10 w-10 rounded object-cover" />}
          <div className="min-w-0">
            <p className="truncate text-xs text-mx-text">{selectedTitle}</p>
            <p className="text-[11px] text-mx-muted">{platformLabel(selectedPlatform)}</p>
          </div>
        </div>
      )}

      {selectedTitle && selectedPlatform && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-mx-primary/30 bg-mx-primary/5 p-3">
          <label className="flex items-center gap-2 text-xs text-mx-text">
            <input type="checkbox" checked={passPrice} onChange={(e) => setPassPrice(e.target.checked)} />
            <span>
              추천판매가 {num(form.sellingPrice).toLocaleString()}원을 상세페이지 「정상가」로 함께 넘기기
              <span className="block text-[11px] text-mx-muted">할인가로는 넘기지 않아 이미지에 특가·할인 문구가 생기지 않습니다.</span>
            </span>
          </label>
          <a
            href={shopDetailPageUrl(
              { title: selectedTitle, platform: selectedPlatform, detailUrl: selectedDetailUrl },
              passPrice ? num(form.sellingPrice) : undefined,
              inFlow,
            )}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg bg-mx-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8]"
          >
            📄 상세페이지 만들기
          </a>
        </div>
      )}

      <p className="text-xs text-mx-muted">
        상품 선택시 <span className="font-semibold text-mx-text">원가/추천판매가만 자동으로
        채워지고</span>, 다른 값은 수정시 즉시 다시 계산됩니다.
        {isDomestic && (
          <>
            <br />
            <span className="font-semibold text-mx-success">
              국내 소싱(도매매/11번가) 상품이라 관세·부가세·해외운송비·국내 입고/검수비는
              계산에서 제외됩니다(입력창도 숨김 처리됩니다).
            </span>
          </>
        )}
      </p>

      <MarketSalesSection form={form} onChange={onChange} />

      {!isDomestic && <ForeignCostBox customsFx={customsFx} onApply={(krw) => onChange("sourcePrice", String(krw))} />}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-mx-text">원가(원) *</span>
          <input type="number" value={form.sourcePrice} onChange={(e) => onChange("sourcePrice", e.target.value)} className="input-sm w-full border-mx-primary/40" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-mx-text">추천판매가(원) *</span>
          <input type="number" value={form.sellingPrice} onChange={(e) => onChange("sellingPrice", e.target.value)} className="input-sm w-full border-mx-primary/40" />
        </label>
        {!isDomestic && (
          <>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">관세율(%) — 기본 {activeDefaults.customsDutyRate}%</span>
              <input type="number" value={form.customsDutyRate} onChange={(e) => onChange("customsDutyRate", e.target.value)} className="input-sm w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">부가세율(%) — 기본 {activeDefaults.vatRate}%</span>
              <input type="number" value={form.vatRate} onChange={(e) => onChange("vatRate", e.target.value)} className="input-sm w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">
                개당 해외 운송비(원) — 기본 {activeDefaults.shippingPerUnitKrw.toLocaleString()}원
              </span>
              <input type="number" value={form.shippingPerUnit} onChange={(e) => onChange("shippingPerUnit", e.target.value)} className="input-sm w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">
                국내 입고/검수비(원) — 기본 {activeDefaults.domesticFeePerUnitKrw.toLocaleString()}원
              </span>
              <input type="number" value={form.domesticFee} onChange={(e) => onChange("domesticFee", e.target.value)} className="input-sm w-full" />
            </label>
          </>
        )}
        <label className="space-y-1">
          <span className="text-xs text-mx-muted">
            {isMarket ? `판매 수수료율(%) — ${MARKET_LABELS[form.market as MarketId]} 기준 자동, 바꿀 수 있음` : `판매 플랫폼 수수료율(%) — 기본 ${MARGIN_DEFAULTS.platformFeeRate}%`}
          </span>
          <input type="number" value={form.platformFeeRate} onChange={(e) => onChange("platformFeeRate", e.target.value)} className="input-sm w-full" />
          <p className="text-[11px] leading-snug text-mx-muted">
            실제 판매하실 플랫폼·카테고리 기준으로 직접 수정후 사용해주세요.{" "}
            <a href="/fees" className="font-semibold text-mx-link underline">
              플랫폼별 수수료 보기
            </a>
          </p>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-mx-muted">
            택배비(원) — 기본 {MARGIN_DEFAULTS.deliveryFeeKrw.toLocaleString()}원
          </span>
          <input type="number" value={form.deliveryFee} onChange={(e) => onChange("deliveryFee", e.target.value)} className="input-sm w-full" />
          <p className="text-[11px] leading-snug text-mx-muted">
            상품의 무게·부피·배송 지역에 따라 실제 택배비가 달라질 수 있습니다. 본인 상황에
            맞게 직접 수정해서 사용해주세요.
          </p>
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-xs text-mx-muted">개당 마케팅비(원, 선택)</span>
          <input type="number" value={form.marketingFee} onChange={(e) => onChange("marketingFee", e.target.value)} className="input-sm w-full" />
        </label>
      </div>

      <div className={`rounded-xl border ${tone.box} overflow-hidden`}>
        {/* 핵심 결과 — 한눈에 보이는 요약 */}
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className={`text-xs font-semibold ${tone.text} opacity-80`}>개당 예상 마진{isMarket ? ` · ${MARKET_LABELS[form.market as MarketId]}` : ""}</p>
            <p className={`text-2xl font-extrabold tabular-nums ${tone.text}`}>
              {profit.toLocaleString()}원
            </p>
          </div>
          <span className={`shrink-0 rounded-full ${tone.badge} px-4 py-1.5 text-sm font-bold text-white tabular-nums`}>
            마진율 {marginPct}%
          </span>
        </div>

        {/* 계산 과정 상세 — 영수증 형태로 항목별 표시 */}
        <div className="border-t border-black/5 bg-mx-surface/60 px-4 py-3 text-sm">
          {isDomestic ? (
            <p className="mb-1.5 text-xs text-mx-muted">
              국내 소싱이라 관세·부가세·해외운송비·국내 입고/검수비는 계산에서 제외됩니다 —
              원가 그대로가 최종 원가입니다.
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-xs font-bold text-mx-muted">최종 수입 단가 계산</p>
              <div className="space-y-1 text-mx-text">
                <ReceiptRow label="원가" value={num(form.sourcePrice)} />
                <ReceiptRow label="+ 해외 운송비" value={num(form.shippingPerUnit)} />
                <ReceiptRow label="= 과세가격(관세 기준)" value={marginResult.dutiableValueKrw} />
                <ReceiptRow label={`+ 관세 (과세가격 × ${num(form.customsDutyRate)}%)`} value={marginResult.customsDutyKrw} />
                <ReceiptRow label={`+ 부가세 ((과세가격 + 관세) × ${num(form.vatRate)}%)`} value={marginResult.importVatKrw} />
                <ReceiptRow label="+ 국내 입고/검수비" value={num(form.domesticFee)} />
                <div className="flex justify-between border-t border-dashed border-mx-border pt-1 font-bold text-mx-text">
                  <span>= 최종 수입 단가</span>
                  <span className="tabular-nums">{marginResult.landedCostKrw.toLocaleString()}원</span>
                </div>
              </div>
            </>
          )}

          {isMarket ? (
            <>
              <p className="mb-1.5 mt-3 text-xs font-bold text-mx-muted">마켓 정산 + 최종 결과</p>
              <div className="space-y-1 text-mx-text">
                <ReceiptRow label="판매가" value={num(form.sellingPrice)} />
                {num(form.sellerDiscount) > 0 && <ReceiptRow label="− 판매자 할인" value={num(form.sellerDiscount)} />}
                <ReceiptRow label={`− 판매 수수료 (${num(form.platformFeeRate) + num(form.extraFee)}%)`} value={marketResult.feeKrw} />
                {form.shippingMode === "prepaid" && (
                  <>
                    <ReceiptRow label="+ 받은 배송비" value={num(form.shippingCharge)} />
                    <ReceiptRow label="− 배송비 수수료" value={marketResult.shippingFeeKrw} />
                  </>
                )}
                <div className="flex justify-between border-t border-dashed border-mx-border pt-1 font-bold text-mx-text">
                  <span>= 정산 예상액</span>
                  <span className="tabular-nums">{marketResult.settlement.toLocaleString()}원</span>
                </div>
                <ReceiptRow label={isDomestic ? "− 최종 원가" : "− 최종 수입 단가"} value={marginResult.landedCostKrw} />
                {num(form.packCost) > 0 && <ReceiptRow label="− 포장·부자재비" value={num(form.packCost)} />}
                <ReceiptRow label={form.shippingMode === "cod" ? "− 택배비(착불: 구매자 부담)" : "− 택배비"} value={form.shippingMode === "cod" ? 0 : num(form.deliveryFee)} />
                <ReceiptRow label="− 마케팅비" value={num(form.marketingFee)} />
                {marketResult.fixedPerUnit > 0 && <ReceiptRow label="− 월 고정비(개당)" value={marketResult.fixedPerUnit} />}
                <div className={`flex justify-between border-t border-mx-border pt-1 text-base font-extrabold ${tone.text}`}>
                  <span>= 마진</span>
                  <span className="tabular-nums">{profit.toLocaleString()}원</span>
                </div>
                <p className="text-[11px] text-mx-muted">마진율은 구매자가 낸 금액({marketResult.paidTotal.toLocaleString()}원) 대비입니다.</p>
              </div>
            </>
          ) : (
            <>
            <p className="mb-1.5 mt-3 text-xs font-bold text-mx-muted">판매 비용 + 최종 결과</p>
            <div className="space-y-1 text-mx-text">
              <ReceiptRow label={isDomestic ? "최종 원가" : "최종 수입 단가"} value={marginResult.landedCostKrw} />
              <ReceiptRow label={`+ 플랫폼 수수료 (${form.platformFeeRate || 0}%)`} value={marginResult.platformFeeKrw} />
              <ReceiptRow label="+ 택배비" value={num(form.deliveryFee)} />
              <ReceiptRow label="+ 마케팅비" value={num(form.marketingFee)} />
              <div className="flex justify-between border-t border-dashed border-mx-border pt-1 font-bold text-mx-text">
                <span>= 총 비용</span>
                <span className="tabular-nums">{marginResult.totalCostKrw.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-mx-text">
                <span>추천판매가</span>
                <span className="tabular-nums">{num(form.sellingPrice).toLocaleString()}원</span>
              </div>
              <div className={`flex justify-between border-t border-mx-border pt-1 text-base font-extrabold ${tone.text}`}>
                <span>= 마진</span>
                <span className="tabular-nums">{marginResult.contributionProfitKrw.toLocaleString()}원</span>
              </div>
            </div>
            </>
          )}

          <div className="mt-3 space-y-2 border-t border-mx-border pt-3 text-xs text-mx-text">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>🧮 손익분기 판매가</span>
              <span className="font-bold tabular-nums">{breakEven == null ? "계산 불가(수수료가 너무 큼)" : `${breakEven.toLocaleString()}원`}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-1">
                🎯 목표 마진율
                <input type="number" value={form.targetMargin} onChange={(e) => onChange("targetMargin", e.target.value)} className="input-sm w-16" />%의 판매가
              </label>
              <span className="font-bold tabular-nums">{targetPrice == null ? "계산 불가" : `${targetPrice.toLocaleString()}원`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-mx-border">
        <button type="button" onClick={() => setShowCompare((v) => !v)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold text-mx-text">
          <span>⚖ 5개 마켓 나란히 비교(같은 원가·판매가·배송 조건)</span>
          <span>{showCompare ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {showCompare && <MarketCompareTable input={marketInput} />}
      </div>

      <p className="text-xs text-mx-muted">
        ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
        세무사를 통해 확인해주세요. 품목별 참고 관세율은{" "}
        <a href="/fees#tariff" className="font-semibold text-mx-link underline">수입 관세율 참고표</a>에 있습니다.
        <br />※ 판매 목적 수입은 개인 소액 면세(자가사용)가 적용되지 않을 수 있어, 이 계산은 면세 없이 관세·부가세를 모두 넣었습니다.
      </p>
    </div>
  );
}

/** EC-W7: 달러·위안 등 외화 원가 → 관세청 과세환율로 원화 환산(환율이 없으면 회원이 직접 입력) */
function ForeignCostBox({ customsFx, onApply }: { customsFx?: CustomsFxSnapshot; onApply: (krw: number) => void }) {
  const [currency, setCurrency] = useState<FxCurrency>("USD");
  const [amount, setAmount] = useState("");
  const official = customsFx?.rates[currency];
  const [manualRate, setManualRate] = useState("");
  const rate = official ?? (Number(manualRate) || null);
  const krw = toKrw(Number(amount), rate);
  const weekLabel = customsFx?.applyStart ? `${Number(customsFx.applyStart.slice(5, 7))}월 ${Number(customsFx.applyStart.slice(8, 10))}일 주` : null;
  return (
    <div className="space-y-2 rounded-lg border border-mx-border bg-mx-raised p-3 text-xs text-mx-text">
      <p className="font-bold">💱 외화 원가로 넣기 <span className="font-normal text-mx-muted">(1688·타오바오·공장 견적 등 — 알리 검색 결과는 이미 원화)</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={currency} onChange={(e) => setCurrency(e.target.value as FxCurrency)} className="input-sm w-auto" aria-label="통화">
          {FX_CURRENCIES.map((c) => (
            <option key={c} value={c}>{FX_LABELS[c]}({c})</option>
          ))}
        </select>
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" className="input-sm w-28" aria-label="외화 금액" />
        {!official && (
          <input type="number" min="0" step="0.01" value={manualRate} onChange={(e) => setManualRate(e.target.value)} placeholder={`1${FX_LABELS[currency]} = ?원`} className="input-sm w-32" aria-label="환율 직접 입력" />
        )}
        <span className="tabular-nums">= {krw == null ? "—" : `${krw.toLocaleString()}원`}</span>
        <button type="button" disabled={krw == null} onClick={() => krw != null && onApply(krw)} className="rounded-lg bg-mx-primary px-3 py-1.5 font-bold text-white disabled:opacity-40">
          원가에 넣기
        </button>
      </div>
      <p className="text-[11px] text-mx-muted">
        {official
          ? `적용 환율 1${FX_LABELS[currency]} = ${official.toLocaleString()}원 (관세청 과세환율${weekLabel ? `, ${weekLabel}` : ""})`
          : "관세청 과세환율을 아직 불러오지 못했습니다 — 환율을 직접 넣어 주세요(관세청 「관세환율」 조회 화면 참고)."}
      </p>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value.toLocaleString()}원</span>
    </div>
  );
}

/** 5개 마켓 대표 수수료로 같은 조건을 비교한다(카테고리별 요율은 다를 수 있음 — 표 아래 안내). */
function MarketCompareTable({ input }: { input: MarketMarginInput }) {
  const shippingMode: ShippingMode = input.market === "other" ? "free" : input.shippingMode;
  const rows = compareMarkets({ ...input, shippingMode });
  return (
    <div className="border-t border-mx-border px-3 pb-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-xs">
          <thead>
            <tr className="text-left text-mx-muted">
              <th className="py-2 pr-2">마켓</th>
              <th className="pr-2 text-right">수수료</th>
              <th className="pr-2 text-right">정산 예상</th>
              <th className="pr-2 text-right">마진</th>
              <th className="pr-2 text-right">마진율</th>
              <th className="text-right">손익분기가</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.market} className={`border-t border-mx-border ${i === 0 ? "font-bold text-[#a7f3d0]" : "text-mx-text"}`}>
                <td className="py-1.5 pr-2">{i === 0 ? "🏆 " : ""}{MARKET_LABELS[r.market]} {r.verified ? "✅" : "⚠"}</td>
                <td className="pr-2 text-right tabular-nums">{r.feePct}%</td>
                <td className="pr-2 text-right tabular-nums">{r.settlement.toLocaleString()}원</td>
                <td className={`pr-2 text-right tabular-nums ${r.profit < 0 ? "text-[#fecdd3]" : ""}`}>{r.profit.toLocaleString()}원</td>
                <td className="pr-2 text-right tabular-nums">{r.marginPct}%</td>
                <td className="text-right tabular-nums">{r.breakEven == null ? "—" : `${r.breakEven.toLocaleString()}원`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-mx-muted">
        각 마켓 대표 수수료 기준입니다(카테고리별로 다름). ✅ 공식 표 확인 · ⚠ 미확인 대표값 — 정확한 비교는 마켓을 골라 카테고리 요율로 확인하세요.
      </p>
    </div>
  );
}
