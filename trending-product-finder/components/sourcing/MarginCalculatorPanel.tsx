"use client";
import { useState } from "react";
import { shopDetailPageUrl } from "@/lib/shopDetailLink";
// v1.10: SourcingCalculator에서 분리 — 💰 마진 계산기(입력칸 + 영수증 형태 결과). 화면·계산식은 이전과 같다.
import { calcMargin, MARGIN_DEFAULTS, type MarginResult } from "@/lib/margin";
import { defaultsFor, isDomesticPlatform, platformLabel, type Platform } from "@/lib/sourcingResults";

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
}

/** 채널 기본값으로 원가·판매가를 제외한 비용 칸을 채운다 */
export function costFieldsFrom(defaults: typeof MARGIN_DEFAULTS): Omit<MarginForm, "sourcePrice" | "sellingPrice"> {
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
export const INITIAL_MARGIN_FORM: MarginForm = { sourcePrice: "0", sellingPrice: "0", ...costFieldsFrom(MARGIN_DEFAULTS) };

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
}

export function MarginCalculatorPanel({
  form,
  onChange,
  selectedTitle,
  selectedImage,
  selectedPlatform,
  selectedDetailUrl,
  onReset,
}: Props) {
  const marginResult = marginOf(form);
  // v1.23(추가): 선택 기능 — 추천판매가를 상세페이지 「정상가」로 함께 넘길지(할인가로는 넘기지 않음).
  const [passPrice, setPassPrice] = useState(true);
  const isDomestic = isDomesticPlatform(selectedPlatform);
  const activeDefaults = defaultsFor(selectedPlatform);
  const num = (v: string) => Number(v) || 0;

  const dutyAndVatKrw = Math.round((num(form.sourcePrice) * (num(form.customsDutyRate) + num(form.vatRate))) / 100);
  const tone =
    marginResult.marginRatePct >= 20
      ? { badge: "bg-[#047857]", box: "border-mx-success/30 bg-mx-success/10", text: "text-[#a7f3d0]" }
      : marginResult.marginRatePct >= 0
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
            판매 플랫폼 수수료율(%) — 기본 {MARGIN_DEFAULTS.platformFeeRate}%
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
            <p className={`text-xs font-semibold ${tone.text} opacity-80`}>개당 예상 마진</p>
            <p className={`text-2xl font-extrabold tabular-nums ${tone.text}`}>
              {marginResult.contributionProfitKrw.toLocaleString()}원
            </p>
          </div>
          <span className={`shrink-0 rounded-full ${tone.badge} px-4 py-1.5 text-sm font-bold text-white tabular-nums`}>
            마진율 {marginResult.marginRatePct}%
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
                <ReceiptRow label={`+ 관세·부가세 (${num(form.customsDutyRate) + num(form.vatRate)}%)`} value={dutyAndVatKrw} />
                <ReceiptRow label="+ 해외 운송비" value={num(form.shippingPerUnit)} />
                <ReceiptRow label="+ 국내 입고/검수비" value={num(form.domesticFee)} />
                <div className="flex justify-between border-t border-dashed border-mx-border pt-1 font-bold text-mx-text">
                  <span>= 최종 수입 단가</span>
                  <span className="tabular-nums">{marginResult.landedCostKrw.toLocaleString()}원</span>
                </div>
              </div>
            </>
          )}

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
        </div>
      </div>

      <p className="text-xs text-mx-muted">
        ※ 관세/부가세율은 품목·통관 방식에 따라 달라지는 추정치입니다. 실제 세율은 관세청 또는
        세무사를 통해 확인해주세요.
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
