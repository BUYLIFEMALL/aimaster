"use client";

import { useEffect, useMemo, useState } from "react";
import { FEE_KINDS, REGIONS, VAT_TYPES, brokerFee, regionNote, vatOf, type FeeDeal, type FeeKind, type VatType } from "@/lib/desk/fee";
import { parseManwon } from "@/lib/desk/consent";

const field = "mb-1 block text-xs font-semibold text-mx-muted";
const wonText = (v: number) => `${v.toLocaleString("ko-KR")}원`;
const manText = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}억 원` : `${v.toLocaleString("ko-KR")}만 원`);

// D5(2026-11-03): 중개보수 상한 계산기 — 화면 안에서만 계산(저장·서버 호출 없음). 매물 화면에서 값을 채워 열 수 있다(?kind=&deal=&price=&monthly=).
export function FeeCalculator({ initial }: { initial: { kind?: string; deal?: string; price?: string; monthly?: string; presale?: string } }) {
  const [kind, setKind] = useState<FeeKind>((FEE_KINDS as readonly string[]).includes(initial.kind ?? "") ? (initial.kind as FeeKind) : "주택");
  const [deal, setDeal] = useState<FeeDeal>(initial.deal === "전세" || initial.deal === "월세" ? initial.deal : "매매");
  const [price, setPrice] = useState(initial.price ?? "");
  const [monthly, setMonthly] = useState(initial.monthly ?? "");
  const [agreed, setAgreed] = useState("");
  const [vatType, setVatType] = useState<VatType>("general");
  useEffect(() => { // 내 과세 유형은 이 브라우저에 기억(서버 저장 없음)
    try {
      const saved = localStorage.getItem("realty-desk-vat-type");
      if (VAT_TYPES.some((v) => v.key === saved)) setVatType(saved as VatType);
    } catch { /* 읽지 못하면 일반과세자 */ }
  }, []);
  const pickVat = (v: VatType) => {
    setVatType(v);
    try { localStorage.setItem("realty-desk-vat-type", v); } catch { /* 저장 못 해도 계산은 됨 */ }
  };
  const [region, setRegion] = useState<string>("서울특별시");

  const result = useMemo(() => {
    const p = parseManwon(price);
    const m = deal === "월세" ? parseManwon(monthly) : 0;
    if (p === null || Number.isNaN(p) || Number.isNaN(m)) return null;
    const a = agreed.trim() ? Number(agreed) / 100 : undefined;
    return brokerFee(kind, deal, p, m ?? 0, a !== undefined && Number.isFinite(a) ? a : undefined);
  }, [kind, deal, price, monthly, agreed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-card space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={field}>매물 종류</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as FeeKind)} className="mx-input">{FEE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          {kind === "주택" && (
            <label className="sm:col-span-2"><span className={field}>지역(주택 요율은 시·도 조례로 정해요)</span>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="mx-input">{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></label>
          )}
          <label><span className={field}>거래</span>
            <select value={deal} onChange={(e) => setDeal(e.target.value as FeeDeal)} className="mx-input"><option>매매</option><option>전세</option><option>월세</option></select></label>
          <label><span className={field}>{deal === "매매" ? "매매가" : "보증금"} (예: 4억, 3.5억, 5000)</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="text" placeholder="만 원 단위" className="mx-input" /></label>
          {deal === "월세" && (
            <label><span className={field}>월세 (만 원)</span>
              <input value={monthly} onChange={(e) => setMonthly(e.target.value)} inputMode="numeric" placeholder="예: 120" className="mx-input" /></label>
          )}
          {kind === "그 외(상가·토지 등)" && (
            <label><span className={field}>협의한 요율 % (비우면 상한 0.9%)</span>
              <input value={agreed} onChange={(e) => setAgreed(e.target.value)} inputMode="decimal" placeholder="예: 0.5" className="mx-input" /></label>
          )}
        </div>
        <fieldset>
          <legend className={field}>내 사무소 과세 유형(이 브라우저에 기억해요)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mx-text">
            {VAT_TYPES.map((v) => (
              <label key={v.key} className="flex min-h-[40px] items-center gap-2">
                <input type="radio" name="vatType" checked={vatType === v.key} onChange={() => pickVat(v.key)} className="h-4 w-4" /> {v.label}
              </label>
            ))}
          </div>
        </fieldset>
        {initial.presale === "1" && kind === "주택" && (
          <p className="rounded-lg bg-[#fff8e6] p-3 text-xs text-mx-text">🏗️ 분양권은 주택 요율로 계산하고, 거래금액은 분양가 전체가 아니라 <b>이미 낸 계약금·중도금 + 프리미엄</b>으로 잡아요. 금액 칸에 그 합계를 넣어 주세요.</p>
        )}
      </div>

      <div className="mx-card p-5">
        {!result ? (
          <p className="text-sm text-mx-muted">금액을 넣으면 바로 계산해요.</p>
        ) : (
          <div className="space-y-2 text-sm text-mx-text">
            <p className="text-xs text-mx-muted">거래금액 {manText(result.baseManwon)}{deal === "월세" ? " (보증금 + 월세×100, 5천만 원 미만이면 ×70)" : ""} · 상한요율 {(result.rate * 100).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%{result.capWon !== null ? ` · 한도 ${wonText(result.capWon)}` : ""}</p>
            {(() => {
              const vatWon = vatOf(result.feeWon, vatType);
              return (
                <>
                  <p className="text-3xl font-black text-mx-text">{wonText(result.feeWon + vatWon)}</p>
                  <p className="text-mx-muted">{vatType === "none" ? "부가세 별도" : `중개보수 ${wonText(result.feeWon)} + 부가세 ${wonText(vatWon)}(${vatType === "simple" ? "간이과세자 4%" : "일반과세자 10%"})`} · 의뢰인 한쪽 기준 상한</p>
                </>
              );
            })()}
            {kind === "주택" && <p className="text-xs text-mx-muted">📍 {regionNote(region)}</p>}
            <p className="rounded-lg bg-[#f4f6f9] p-3 text-xs text-mx-muted">💡 {result.note} 상한 안에서 의뢰인과 협의해 정하며, 계약 전에 중개보수를 설명하고 영수증을 주어야 해요. 참고용 계산이며 법률 자문이 아니에요.</p>
          </div>
        )}
      </div>

      <details className="mx-card p-5 text-sm text-mx-text">
        <summary className="cursor-pointer font-bold">📋 주택 상한요율표 보기 (시행규칙 별표 1)</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <table className="w-full text-xs"><caption className="mb-1 text-left font-bold">매매·교환</caption><tbody>
            {[["5천만 원 미만", "0.6%", "25만 원"], ["5천만~2억 원 미만", "0.5%", "80만 원"], ["2억~9억 원 미만", "0.4%", "없음"], ["9억~12억 원 미만", "0.5%", "없음"], ["12억~15억 원 미만", "0.6%", "없음"], ["15억 원 이상", "0.7%", "없음"]].map((r) => <tr key={r[0]} className="border-t border-mx-border"><td className="py-1">{r[0]}</td><td>{r[1]}</td><td>한도 {r[2]}</td></tr>)}
          </tbody></table>
          <table className="w-full text-xs"><caption className="mb-1 text-left font-bold">임대차(전세·월세)</caption><tbody>
            {[["5천만 원 미만", "0.5%", "20만 원"], ["5천만~1억 원 미만", "0.4%", "30만 원"], ["1억~6억 원 미만", "0.3%", "없음"], ["6억~12억 원 미만", "0.4%", "없음"], ["12억~15억 원 미만", "0.5%", "없음"], ["15억 원 이상", "0.6%", "없음"]].map((r) => <tr key={r[0]} className="border-t border-mx-border"><td className="py-1">{r[0]}</td><td>{r[1]}</td><td>한도 {r[2]}</td></tr>)}
          </tbody></table>
        </div>
        <p className="mt-3 text-xs text-mx-muted">오피스텔(전용 85㎡ 이하, 전용 부엌·수세식 화장실·목욕시설): 매매 0.5%, 임대 0.4%. 주택·오피스텔 외(상가·사무실·건물·토지 등): 0.9% 안에서 협의. 분양권: 주택 요율, 거래금액 = 이미 낸 계약금·중도금 + 프리미엄. 부가세: 일반과세자 10%, 간이과세자 4%(부동산중개업 부가가치율 40% × 10%). 근거: 공인중개사법 제32조, 시행규칙 제20조, 국토교통부 마이홈 게시 요율(2026-11-03 확인). 주택 요율은 시·도 조례로 정하므로 지역 조례를 함께 확인하세요.</p>
      </details>
    </div>
  );
}
