"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aiSummaryAction, saveReportAction, type ReportActionState } from "@/lib/actions/reports";
import { diffPct, parseAskingPrice } from "@/lib/realestate/report";
import { formatWon } from "@/lib/format";

// B2 주소 리포트(2026-11-03): 호가 비교·저장·인쇄·AI 총평 버튼. 호가 비교는 화면 계산만(저장 전에는 어디에도 보내지 않음).

function Diff({ label, pct, base }: { label: string; pct: number | null; base: number | null | undefined }) {
  if (pct === null) return <li className="text-mx-muted">{label}: 비교할 자료 없음</li>;
  const tone = pct > 0 ? "text-mx-accent" : pct < 0 ? "text-mx-success" : "text-mx-text";
  return (
    <li>
      {label}({formatWon(base)})보다 <b className={tone}>{pct > 0 ? `${pct}% 높음` : pct < 0 ? `${Math.abs(pct)}% 낮음` : "같음"}</b>
    </li>
  );
}

export function AskingCompare({ value, onChange, saleMedian, latest, assessed, months }: { value: string; onChange: (v: string) => void; saleMedian: number | null; latest: number | null; assessed: number | null; months: number }) {
  const asking = parseAskingPrice(value);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-mx-text" htmlFor="asking">💬 내가 아는 호가</label>
      <input
        id="asking"
        name="asking"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 8억 5,000 · 8.5억 · 85000"
        inputMode="text"
        className="min-h-[44px] w-full rounded-lg border border-mx-border bg-mx-raised px-3 text-sm text-mx-text sm:max-w-xs"
      />
      {value && !asking && <p className="text-xs text-mx-danger">호가를 읽지 못했어요. 「8억 5,000」처럼 넣어 주세요.</p>}
      {asking && (
        <ul className="space-y-1 text-sm text-mx-text">
          <li className="text-xs text-mx-muted">입력한 호가 {formatWon(asking)} 기준</li>
          <Diff label={`최근 ${months}개월 매매 중간값`} pct={diffPct(asking, saleMedian)} base={saleMedian} />
          <Diff label="가장 최근 거래" pct={diffPct(asking, latest)} base={latest} />
          <Diff label="공동주택 공시가격" pct={diffPct(asking, assessed)} base={assessed} />
        </ul>
      )}
    </div>
  );
}

/** 저장한 리포트: 저장 때 넣은 호가 비교(읽기만) */
export function AskingView({ asking, saleMedian, latest, assessed, months }: { asking: number | null; saleMedian: number | null; latest: number | null; assessed: number | null; months: number }) {
  return (
    <div>
      <h2 className="mx-section-title">💬 저장 때 넣은 호가</h2>
      {asking ? (
        <ul className="space-y-1 text-sm text-mx-text">
          <li className="text-xs text-mx-muted">호가 {formatWon(asking)} 기준</li>
          <Diff label={`최근 ${months}개월 매매 중간값`} pct={diffPct(asking, saleMedian)} base={saleMedian} />
          <Diff label="가장 최근 거래" pct={diffPct(asking, latest)} base={latest} />
          <Diff label="공동주택 공시가격" pct={diffPct(asking, assessed)} base={assessed} />
        </ul>
      ) : (
        <p className="text-sm text-mx-muted">호가를 넣지 않고 저장했어요.</p>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="mx-btn-ghost min-h-[44px] px-4 text-sm">
      🖨 인쇄·PDF로 저장
    </button>
  );
}

export function SaveReportForm(props: {
  source: "listing" | "onsite";
  sourceId: string;
  pnu: string;
  title: string;
  subtitle: string;
  reportJson: string;
  saleMedian: number | null;
  latest: number | null;
  assessed: number | null;
  months: number;
}) {
  const [asking, setAsking] = useState("");
  const [state, action, pending] = useActionState<ReportActionState, FormData>(saveReportAction, {});
  return (
    <form action={action} className="mx-card space-y-4 p-5 print:hidden">
      <input type="hidden" name="source" value={props.source} />
      <input type="hidden" name="sourceId" value={props.sourceId} />
      <input type="hidden" name="pnu" value={props.pnu} />
      <input type="hidden" name="title" value={props.title} />
      <input type="hidden" name="subtitle" value={props.subtitle} />
      <input type="hidden" name="report" value={props.reportJson} />
      <AskingCompare value={asking} onChange={setAsking} saleMedian={props.saleMedian} latest={props.latest} assessed={props.assessed} months={props.months} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">
          {pending ? "저장 중…" : "💾 리포트 저장"}
        </button>
        <PrintButton />
        <Link href="/report/saved" className="text-sm text-mx-link underline">저장한 리포트 보기</Link>
      </div>
      <p className="text-xs text-mx-muted">저장하면 지금 숫자와 호가가 그대로 남고, 저장한 리포트에서 🧠 AI 총평을 받을 수 있어요. 저장 기간은 1년이에요.</p>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
    </form>
  );
}

export function AiSummaryButton({ id, hasSummary }: { id: string; hasSummary: boolean }) {
  const [state, action, pending] = useActionState<ReportActionState, FormData>(aiSummaryAction, {});
  return (
    <form action={action} className="space-y-2 print:hidden">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">
        {pending ? "AI가 읽는 중… (10~30초)" : hasSummary ? "🧠 AI 총평 다시 받기" : "🧠 AI 총평 받기"}
      </button>
      <p className="text-xs text-mx-muted">회원님 본인 Claude 키로 한 번 불러요(누를 때마다 요금이 들어요). 리포트 숫자만 보내고, 투자 권유는 하지 않아요.</p>
      {state.error && (
        <p className="text-sm text-mx-danger">
          {state.error} {state.needsKey && <Link href="/settings" className="text-mx-link underline">API키 등록하러 가기</Link>}
        </p>
      )}
    </form>
  );
}
