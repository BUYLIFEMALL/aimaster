// D30 정기 주문 목록 — 손님 「내 정기 주문」과 운영자 「정기 주문」이 함께 쓴다(서버 컴포넌트, 버튼은 폼 동작)
import Link from "next/link";
import { RECURRING_PAY_LABEL, RECURRING_STATUS_LABEL, scheduleLabel } from "@/lib/recurring";
import { changeRecurringAction, recurringQtyAction } from "@/lib/recurring-actions";
import type { RecurringRow, RecurringRun } from "@/lib/recurring-store";
import { formatWon } from "@/lib/products";

const TONE = { active: "bg-green-50 text-green-700", paused: "bg-amber-50 text-amber-800", cancelled: "bg-gray-100 text-gray-500" };

export function RecurringList({ slug, rows, runs, back, admin = false }: { slug: string; rows: RecurringRow[]; runs: RecurringRun[]; back: string; admin?: boolean }) {
  if (!rows.length) return <p className="rounded border p-4 text-sm text-gray-500">정기 주문이 없습니다.{admin ? "" : " 지난 주문 상세 아래 「이 주문을 정기 주문으로 만들기」에서 만들 수 있습니다."}</p>;
  const orderHref = (id: string) => (admin ? `/s/${slug}/admin/orders/${id}` : `/s/${slug}/orders/${id}`);
  return (
    <ul className="space-y-3" data-recurring-list>
      {rows.map((r) => {
        const mine = runs.filter((x) => x.recurring_id === r.id).slice(0, 5);
        const btn = (action: "pause" | "resume" | "skip" | "cancel", label: string, cls = "border") => (
          <form action={changeRecurringAction.bind(null, slug, r.id, action, back)}>
            <button className={`rounded px-2 py-1 text-xs ${cls}`} data-recurring-action={action}>{label}</button>
          </form>
        );
        return (
          <li key={r.id} className={`rounded-lg border p-4 text-sm ${r.status === "cancelled" ? "opacity-60" : ""}`} data-recurring-row>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 text-xs ${TONE[r.status]}`}>{RECURRING_STATUS_LABEL[r.status]}</span>
              <b>{scheduleLabel(r)}</b>
              <span className="text-gray-500">· {RECURRING_PAY_LABEL[r.pay_method]}</span>
              {admin && r.customer && <span className="text-gray-500">· {r.customer.company || r.customer.name}</span>}
              {r.status !== "cancelled" && <span className="ml-auto">다음 주문일 <b data-next-date>{r.next_date}</b></span>}
            </div>
            {r.last_status && (
              <p className={`mt-1 text-xs ${r.last_status === "failed" ? "text-red-600" : "text-gray-500"}`} data-last-result>
                지난 회차 {r.last_run_date}: {r.last_status === "ordered" ? "주문됨" : `주문 못 함 — ${r.last_reason ?? ""}`}
                {r.last_order_id && <> · <Link href={orderHref(r.last_order_id)} className="underline">주문 보기</Link></>}
              </p>
            )}
            <form action={recurringQtyAction.bind(null, slug, r.id, r.items.length, back)} className="mt-2">
              <ul className="divide-y rounded border">
                {r.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 px-2 py-1">
                    <span className="flex-1 truncate">{it.name}{it.option && <span className="text-gray-500"> · {it.option}</span>}</span>
                    {r.status === "cancelled" ? (
                      <span>{it.qty}개</span>
                    ) : (
                      <label className="flex items-center gap-1 text-xs">
                        <input name={`qty_${i}`} type="number" min={0} max={999} defaultValue={it.qty} className="w-16 rounded border px-1 py-0.5 text-right" aria-label={`${it.name} 수량`} />개
                      </label>
                    )}
                  </li>
                ))}
              </ul>
              {r.status !== "cancelled" && <button className="mt-1 rounded border px-2 py-1 text-xs" data-recurring-qty>수량 저장(0이면 빼기)</button>}
            </form>
            {r.status !== "cancelled" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.status === "active" ? btn("pause", "일시정지") : btn("resume", "다시 시작")}
                {r.status === "active" && btn("skip", "다음 한 번 건너뛰기")}
                {btn("cancel", "해지", "border border-red-300 text-red-700")}
              </div>
            )}
            {mine.length > 0 && (
              <details className="mt-2 text-xs text-gray-600">
                <summary className="cursor-pointer">최근 회차 {mine.length}개</summary>
                <ul className="mt-1 space-y-0.5">
                  {mine.map((x) => (
                    <li key={x.id}>
                      {x.run_date} · {x.status === "ordered" ? <>주문됨 {x.total != null && formatWon(x.total)}{x.order_id && <> · <Link href={orderHref(x.order_id)} className="underline">보기</Link></>}</> : <span className="text-red-600">못 함 — {x.reason}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
