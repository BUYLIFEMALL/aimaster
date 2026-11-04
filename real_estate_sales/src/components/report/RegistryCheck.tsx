"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registryCheckAction, type RegistryActionState } from "@/lib/actions/reports";
import { gapRiskPercent, parseAskingPrice, riskBand, type RiskLevel } from "@/lib/realestate/report";
import { formatWon } from "@/lib/format";

// RQ-B4 등기부 권리 점검(2026-11-04). 결과는 이 화면에만 보이고 저장하지 않는다.

const LEVEL_TONE: Record<string, string> = { 위험: "text-mx-danger", 주의: "text-mx-accent", 참고: "text-mx-muted", 보통: "text-mx-success" };

export function RiskBadge({ level }: { level: RiskLevel | "참고" | null }) {
  if (!level) return null;
  return <b className={`ml-1 ${LEVEL_TONE[level]}`}>{level}</b>;
}

export function RegistryCheck({ saleMedian, jeonseMedian }: { saleMedian: number | null; jeonseMedian: number | null }) {
  const [state, action, pending] = useActionState<RegistryActionState, FormData>(registryCheckAction, {});
  const [consent, setConsent] = useState(false);
  const [deposit, setDeposit] = useState(jeonseMedian ? String(jeonseMedian) : "");
  const r = state.result;
  const depositManwon = deposit ? parseAskingPrice(deposit) : null;
  const gap = r ? gapRiskPercent(r.total_max_claim_manwon, depositManwon, saleMedian) : null;

  return (
    <div className="mx-card space-y-3 p-5">
      <h2 className="mx-section-title">🧾 등기부로 권리 점검</h2>
      <p className="text-sm text-mx-muted">
        인터넷등기소에서 직접 발급한 등기부(등기사항전부증명서) PDF를 올리면, 근저당·압류·가압류·신탁 같은 위험 항목을 표로 정리해 드려요. 올린 파일과 결과는 저장하지 않아요.
      </p>
      <form action={action} className="space-y-3 print:hidden">
        <input type="file" name="pdf" accept="application/pdf" required className="block w-full text-sm text-mx-text" />
        <label className="flex items-start gap-2 text-sm text-mx-text">
          <input type="checkbox" name="consent" value="1" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
          <span>등기부 내용(소유자·채권자 이름 포함)이 회원님의 Claude 계정(Anthropic)으로 보내져 분석되는 것에 동의합니다. 요금은 회원님 Claude 계정에서 1회(수십 원 정도) 나가요.</span>
        </label>
        <button type="submit" disabled={pending || !consent} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">
          {pending ? "등기부 읽는 중… (최대 1분)" : "🧾 등기부 점검하기"}
        </button>
      </form>
      {state.error && (
        <p className="text-sm text-mx-danger">
          {state.error} {state.needsKey && <Link href="/settings" className="underline">키 등록하러 가기</Link>}
        </p>
      )}
      {r && (
        <div className="space-y-3">
          <p className="text-xs text-mx-muted">
            {r.property} · 발급일 {r.issued_date ?? "알 수 없음"} · 소유자 {r.owners.join(", ") || "-"}
            {r.last_transfer_date ? ` · 최근 소유권 이전 ${r.last_transfer_date}` : ""}
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-mx-raised p-3">
              <dt className="text-xs text-mx-muted">말소 안 된 채권최고액 합계</dt>
              <dd className="mt-1 font-bold text-mx-text">{r.total_max_claim_manwon ? formatWon(r.total_max_claim_manwon) : "없음"}</dd>
            </div>
            <div className="rounded-xl bg-mx-raised p-3">
              <label className="text-xs text-mx-muted" htmlFor="deposit">전세 보증금(바꿔 넣을 수 있어요)</label>
              <input id="deposit" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="예: 3억" className="mt-1 w-full rounded-lg border border-mx-border bg-transparent px-2 py-1 text-sm text-mx-text" />
            </div>
            <div className="rounded-xl bg-mx-raised p-3">
              <dt className="text-xs text-mx-muted">(채권최고액 + 보증금) ÷ 매매 중간값</dt>
              <dd className="mt-1 font-bold text-mx-text">
                {gap !== null ? `${gap}%` : "매매 시세 없음"}
                <RiskBadge level={riskBand(gap)} />
              </dd>
            </div>
          </dl>
          <div className="overflow-x-auto">
            <table className="mx-table w-full text-sm">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>종류</th>
                  <th>날짜</th>
                  <th className="text-right">금액</th>
                  <th>권리자</th>
                  <th>판단</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it, i) => (
                  <tr key={i} className={it.cancelled ? "opacity-50" : undefined}>
                    <td className="whitespace-nowrap">{it.rank}</td>
                    <td className="whitespace-nowrap">{it.kind}{it.cancelled ? " (말소)" : ""}</td>
                    <td className="whitespace-nowrap text-mx-muted">{it.date ?? "-"}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{it.amount_manwon ? formatWon(it.amount_manwon) : "-"}</td>
                    <td>{it.holder}</td>
                    <td>
                      <RiskBadge level={it.level} /> <span className="text-xs text-mx-muted">{it.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-mx-text">{r.summary}</p>
          <p className="text-xs text-mx-muted">
            ⚠️ AI가 읽어 정리한 참고 자료이며 법률 자문이 아니에요. 원문과 다를 수 있으니 등기부 원문을 함께 보고, 계약 직전에 등기부를 다시 발급해 확인하세요. 80% 이상은 보증금을 돌려받기 어려워질 수 있는 구간이에요.
          </p>
        </div>
      )}
    </div>
  );
}
