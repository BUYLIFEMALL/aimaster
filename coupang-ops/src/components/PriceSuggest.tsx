"use client";

import { useState } from "react";
import { savePrefsAction } from "@/lib/actions/prefs";
import { suggestPrice, type Suggestion } from "@/lib/coupang/priceSuggest";

const cell = "w-24 rounded border border-slate-300 bg-white px-2 py-1 text-[12px] focus:border-blue-500 focus:outline-none";
const num = (v: string) => Number(v.replace(/[,\s원%]/g, ""));
export type PriceSettings = { unitCosts: Record<string, string>; feeRate: string; targetMargin: string };

/** 회원이 쿠팡에서 직접 본 경쟁가로 제안가를 계산한다. 쿠팡에 보내지 않고 새 판매가 칸만 채운다 */
export function PriceSuggest({ vendorItemId, current, settings, onSettings, onUse }: { vendorItemId: number; current: number; settings: PriceSettings; onSettings: (next: PriceSettings) => void; onUse: (price: number) => void }) {
  const key = String(vendorItemId);
  const [competitor, setCompetitor] = useState("");
  const [cost, setCost] = useState(settings.unitCosts[key] ?? "");
  const [feeRate, setFeeRate] = useState(settings.feeRate);
  const [margin, setMargin] = useState(settings.targetMargin);
  const [result, setResult] = useState<Suggestion | null>(null);
  const calc = () => {
    const r = suggestPrice({ current, competitor: num(competitor), cost: num(cost), feeRate: num(feeRate || "x"), margin: num(margin || "x") });
    setResult(r);
    if (!r.ok) return;
    const next = { unitCosts: { ...settings.unitCosts, [key]: cost }, feeRate, targetMargin: margin };
    onSettings(next);
    void savePrefsAction(next).catch(() => {});
  };
  return (
    <details className="mt-1.5 rounded bg-white p-2 text-[11px]">
      <summary className="cursor-pointer font-bold text-slate-700">💡 경쟁가로 가격 제안</summary>
      <p className="mt-1 text-slate-500">쿠팡에서 직접 본 경쟁가를 넣어 주세요. 쿠팡은 위너 여부를 API로 주지 않아, 위너가 된다는 보장은 없습니다.</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        <label>경쟁가(원)<input aria-label="경쟁가" inputMode="numeric" value={competitor} onChange={(e) => setCompetitor(e.target.value)} className={cell} /></label>
        <label>개당 원가(원)<input aria-label="개당 원가" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className={cell} /></label>
        <label>수수료율(%)<input aria-label="수수료율" inputMode="decimal" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} className={cell} /></label>
        <label>최소 이익률(%)<input aria-label="최소 이익률" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} className={cell} /></label>
      </div>
      <button type="button" onClick={calc} className="mt-1.5 rounded border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700">계산</button>
      {result && !result.ok && <p className="mt-1 text-rose-800">❌ {result.problem}</p>}
      {result?.ok && (
        <div className="mt-1 space-y-1">
          <p className="font-bold text-slate-800">{result.message}</p>
          {result.price !== null && <button type="button" onClick={() => onUse(result.price as number)} className="rounded border border-blue-300 bg-white px-2 py-1 font-bold text-blue-800">새 판매가 칸에 넣기</button>}
          <p className="text-slate-500">배송비·광고비·쿠폰은 계산에 넣지 않았습니다. 수수료율은 「매출·정산」의 실제 값을 참고해 주세요.</p>
        </div>
      )}
    </details>
  );
}
