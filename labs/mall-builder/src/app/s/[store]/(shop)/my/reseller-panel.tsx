// D33 마이페이지 「🤝 리셀러」 — 내 링크·연결 손님 수·잔액·이번 달 적립·출금 신청·내역(리셀러로 지정된 손님에게만)
import { LEDGER_KIND_LABEL, PAYOUT_MIN, PAYOUT_STATUS_LABEL, withholdingHint } from "@/lib/reseller";
import type { LedgerRow, PayoutRow, ResellerSummary } from "@/lib/reseller-store";
import { requestPayoutAction } from "@/lib/reseller-actions";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import CopyLink from "./copy-link";

export default function ResellerPanel({ slug, link, s, ledger, payouts }: { slug: string; link: string; s: ResellerSummary; ledger: LedgerRow[]; payouts: PayoutRow[] }) {
  const canPayout = s.active && s.balance >= PAYOUT_MIN && s.pending === 0;
  return (
    <section id="reseller" className="mt-6 scroll-mt-4 rounded-lg border border-emerald-200 p-4 text-sm" data-reseller-panel>
      <h2 className="font-semibold">🤝 리셀러 <span className="ml-1 font-mono text-xs text-gray-500">{s.code} · 수수료 {Number(s.rate)}%</span>{!s.active && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs">쉬는 중</span>}</h2>
      <p className="mt-1 text-xs text-gray-500">이 링크로 들어와 30일 안에 가입한 손님이 내 거래처로 연결되고, 그 손님 주문이 구매 확정되면 (결제 − 배송비) × {Number(s.rate)}%가 쌓입니다. 확정 뒤 반품되면 그만큼 빠집니다.</p>
      <CopyLink url={link} />
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4" data-reseller-summary>
        <div className="rounded border p-2"><p className="text-xs text-gray-500">연결 손님</p><p className="font-semibold">{s.linked}명</p></div>
        <div className="rounded border p-2"><p className="text-xs text-gray-500">이번 달 적립</p><p className="font-semibold">{formatWon(s.month_earned)}</p></div>
        <div className="rounded border p-2"><p className="text-xs text-gray-500">출금 가능</p><p className="font-semibold text-emerald-700" data-reseller-balance>{formatWon(s.balance)}</p></div>
        <div className="rounded border p-2"><p className="text-xs text-gray-500">처리 대기</p><p className="font-semibold">{formatWon(s.pending)}</p></div>
      </div>

      {canPayout ? (
        <form action={requestPayoutAction.bind(null, slug)} className="mt-3 grid gap-2 rounded border p-3 sm:grid-cols-4" data-payout-form>
          <input name="amount" inputMode="numeric" defaultValue={s.balance} aria-label="출금 금액" className="rounded border px-2 py-2" />
          <input name="bank_name" placeholder="은행" maxLength={30} className="rounded border px-2 py-2" />
          <input name="bank_account" placeholder="계좌번호" maxLength={40} className="rounded border px-2 py-2" />
          <input name="bank_holder" placeholder="예금주" maxLength={30} className="rounded border px-2 py-2" />
          <p className="text-xs text-gray-500 sm:col-span-3">운영자가 확인한 뒤 직접 송금합니다. 사업소득 원천징수(3.3%, 예: {formatWon(s.balance)} → 약 {formatWon(withholdingHint(s.balance))})는 운영자와 따로 정산합니다.</p>
          <button className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white">출금 신청</button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-gray-500">{s.pending > 0 ? "처리 대기 중인 출금 신청이 있습니다." : `출금은 ${PAYOUT_MIN.toLocaleString("ko-KR")}원 이상부터 신청할 수 있습니다.`}</p>
      )}

      {payouts.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-600">출금 신청 {payouts.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs">
            {payouts.map((p) => (
              <li key={p.id}>{formatDateTime(p.requested_at)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.reason && ` — ${p.reason}`}</li>
            ))}
          </ul>
        </details>
      )}
      {ledger.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-gray-600">적립·출금 내역 최근 {ledger.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs">
            {ledger.map((l) => (
              <li key={l.id}>{formatDateTime(l.created_at)} · {LEDGER_KIND_LABEL[l.kind]} <b className={l.amount < 0 ? "text-red-600" : "text-emerald-700"}>{l.amount > 0 ? "+" : ""}{l.amount.toLocaleString("ko-KR")}원</b> · 잔액 {l.balance_after.toLocaleString("ko-KR")}원 {l.note && `· ${l.note}`}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
