"use client";
// v1.27(E1): 마진 계산기의 「판매 마켓·정산」 칸 — 마켓·카테고리 요율·배송 방식·할인·추가 수수료·포장비·월 고정비.
// 숫자는 공용 기준 코드 market-fees 사본(lib/marketFees.ts)에서만 가져온다(수수료 숫자를 두 곳에 두지 않음).
import { CATEGORY_FEES, MARKET_FEES, MARKET_LABELS, MONTHLY_SERVER_FEE, SHIPPING_MODE_LABELS, SMARTSTORE_PARTS, defaultFeePct, type MarketId, type ShippingMode } from "@/lib/marketFees";
import type { MarginForm } from "./MarginCalculatorPanel";

const MARKETS: MarketId[] = ["smartstore", "coupang", "11st", "gmarket", "auction"];

export function MarketSalesSection({ form, onChange }: { form: MarginForm; onChange: (field: keyof MarginForm, value: string) => void }) {
  const market = form.market;
  const table = market ? CATEGORY_FEES[market] : undefined;
  const fee = market ? MARKET_FEES[market] : undefined;
  const verified = market ? (table ? table.verified : fee?.verified) : undefined;
  const server = market ? MONTHLY_SERVER_FEE[market] : undefined;

  function pickMarket(v: string) {
    onChange("market", v);
    onChange("category", "");
    if (v) onChange("platformFeeRate", String(defaultFeePct(v as MarketId)));
  }
  function pickCategory(v: string) {
    onChange("category", v);
    if (market) onChange("platformFeeRate", String(defaultFeePct(market, v || undefined)));
  }

  return (
    <div className="space-y-2 rounded-lg border border-mx-primary/30 bg-mx-primary/5 p-3">
      <p className="text-xs font-bold text-mx-text">🏪 판매 마켓 · 정산</p>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-mx-muted">판매할 마켓</span>
          <select value={market} onChange={(e) => pickMarket(e.target.value)} className="input-sm w-full">
            <option value="">직접 입력(수수료 한 칸)</option>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {MARKET_LABELS[m]} {MARKET_FEES[m].verified ? "✅" : "⚠"}
              </option>
            ))}
          </select>
        </label>
        {table && (
          <label className="space-y-1">
            <span className="text-xs text-mx-muted">카테고리(요율 자동)</span>
            <select value={form.category} onChange={(e) => pickCategory(e.target.value)} className="input-sm w-full">
              <option value="">대표값 {market ? defaultFeePct(market) : ""}%</option>
              {table.rows.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label} · {r.ratePct}%{r.exception ? ` (예외: ${r.exception})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {market && (
          <>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">배송 방식</span>
              <select value={form.shippingMode} onChange={(e) => onChange("shippingMode", e.target.value as ShippingMode)} className="input-sm w-full">
                {(Object.keys(SHIPPING_MODE_LABELS) as ShippingMode[]).map((m) => (
                  <option key={m} value={m}>{SHIPPING_MODE_LABELS[m]}</option>
                ))}
              </select>
            </label>
            {form.shippingMode === "prepaid" && (
              <label className="space-y-1">
                <span className="text-xs text-mx-muted">구매자가 내는 배송비(원) — 수수료 {MARKET_FEES[market].shippingRatePct}%</span>
                <input type="number" value={form.shippingCharge} onChange={(e) => onChange("shippingCharge", e.target.value)} className="input-sm w-full" />
              </label>
            )}
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">판매자 할인(원)</span>
              <input type="number" value={form.sellerDiscount} onChange={(e) => onChange("sellerDiscount", e.target.value)} className="input-sm w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">기타 추가 수수료(%) — 제휴·쿠폰 등 확인한 값</span>
              <input type="number" value={form.extraFee} onChange={(e) => onChange("extraFee", e.target.value)} className="input-sm w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mx-muted">개당 포장·부자재비(원)</span>
              <input type="number" value={form.packCost} onChange={(e) => onChange("packCost", e.target.value)} className="input-sm w-full" />
            </label>
          </>
        )}
      </div>

      {market && (
        <>
          <p className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${verified ? "bg-mx-success/10 text-[#a7f3d0]" : "bg-amber-400/10 text-[#fde68a]"}`}>
            {verified ? "✅ 공식 표 확인 · 2026-10-25" : "⚠ 공식 표 미확인 대표값 · 판매자센터 요율로 아래 수수료 칸을 바꿔 쓰세요"} — {table ? table.source : fee?.note}
            {market === "smartstore" && ` · 주문관리 ${SMARTSTORE_PARTS.orderFeePct}%(등급별, 부가세 포함) + 판매수수료 ${SMARTSTORE_PARTS.salesFeePct}%(유입 경로별, 부가세 별도)`}
          </p>
          <details className="text-xs text-mx-muted">
            <summary className="cursor-pointer font-semibold text-mx-text">월 고정비(선택) — 서버 이용료 등</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span>월 고정비(원)</span>
                <input type="number" value={form.monthlyFixed} onChange={(e) => onChange("monthlyFixed", e.target.value)} className="input-sm w-full" />
              </label>
              <label className="space-y-1">
                <span>월 예상 판매 수량(개)</span>
                <input type="number" value={form.monthlyQty} onChange={(e) => onChange("monthlyQty", e.target.value)} className="input-sm w-full" />
              </label>
            </div>
            {server && (
              <p className="mt-1">
                {MARKET_LABELS[market]}는 전월 판매대금이 {server.conditionKrw.toLocaleString()}원 이상이면 월 서버 이용료 {server.krw.toLocaleString()}원이 붙습니다({server.verified ? "✅ 공식 안내" : "⚠"}). 해당되면 위에 넣으세요 — 개당으로 나눠 반영합니다.
              </p>
            )}
          </details>
        </>
      )}
    </div>
  );
}
