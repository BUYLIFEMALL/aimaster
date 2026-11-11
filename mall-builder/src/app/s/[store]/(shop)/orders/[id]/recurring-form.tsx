"use client";

// D30 「정기 주문으로 만들기」 — 이 주문의 품목·수량을 주기마다 자동 주문(가격은 주문일의 그때 가격)
import { useState } from "react";
import { WEEKDAY_LABEL, firstDate, parseSchedule, scheduleLabel, todayKst, upcoming } from "@/lib/recurring";
import { createRecurringAction } from "@/lib/recurring-actions";

type Addr = { id: string; label: string; receiver: string; addr1: string; is_default: boolean };

export default function RecurringForm({ slug, orderId, addresses, creditLimit, depositor }: { slug: string; orderId: string; addresses: Addr[]; creditLimit: number; depositor: string }) {
  const today = todayKst();
  const [kind, setKind] = useState<"weekly" | "monthly">("weekly");
  const [weekday, setWeekday] = useState(1);
  const [every, setEvery] = useState(1);
  const [monthDay, setMonthDay] = useState(1);
  const [start, setStart] = useState(today);
  const parsed = parseSchedule({ kind, weekday, every_weeks: every, month_day: monthDay, start }, today);
  const preview = parsed.ok ? upcoming(parsed.value, firstDate(parsed.value, parsed.start), 3) : [];

  return (
    <details className="mt-6 rounded-lg border p-4" data-recurring-form>
      <summary className="cursor-pointer text-sm font-semibold">🔁 이 주문을 정기 주문으로 만들기</summary>
      <p className="mt-2 text-xs text-gray-500">같은 품목·수량을 정한 날 아침(8시 이후)에 자동으로 주문합니다. 가격은 그날의 가격으로 다시 계산하고, 품절·한도 초과면 주문하지 않고 문자로 알려 드립니다. 「마이페이지 › 정기 주문」에서 언제든 멈추거나 해지할 수 있습니다.</p>
      <form action={createRecurringAction.bind(null, slug, orderId)} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-gray-500">주기</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "weekly" | "monthly")} className="mt-1 w-full rounded border px-2 py-2">
            <option value="weekly">매주·○주마다</option>
            <option value="monthly">매달</option>
          </select>
        </label>
        {kind === "weekly" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">요일</span>
              <select name="weekday" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2">
                {WEEKDAY_LABEL.map((w, i) => <option key={i} value={i}>{w}요일</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">간격</span>
              <select name="every_weeks" value={every} onChange={(e) => setEvery(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "매주" : `${n}주마다`}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <label className="block">
            <span className="text-xs text-gray-500">날짜(없는 달은 말일)</span>
            <select name="month_day" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2">
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}일</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-xs text-gray-500">시작일(이날부터 첫 주문일을 찾음)</span>
          <input type="date" name="start" value={start} min={today} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">결제</span>
          <select name="pay_method" defaultValue={creditLimit > 0 ? "credit" : "bank"} className="mt-1 w-full rounded border px-2 py-2">
            <option value="bank">무통장 입금(주문 뒤 입금 안내)</option>
            {creditLimit > 0 && <option value="credit">외상(한도 안에서 자동 결제)</option>}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">배송지</span>
          <select name="address_id" defaultValue={addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id} className="mt-1 w-full rounded border px-2 py-2">
            {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || a.receiver} · {a.addr1}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">입금자명</span>
          <input name="depositor" defaultValue={depositor} maxLength={20} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-500">주문 메모(선택)</span>
          <input name="memo" maxLength={200} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <p className="text-xs sm:col-span-2" data-recurring-preview>
          {parsed.ok ? <>📅 {scheduleLabel(parsed.value)} — 다음 주문일 <b>{preview.join(" · ")}</b></> : <span className="text-red-600">{parsed.error}</span>}
        </p>
        <div className="sm:col-span-2">
          <button disabled={!parsed.ok || !addresses.length} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">정기 주문 만들기</button>
          {!addresses.length && <span className="ml-2 text-xs text-red-600">마이페이지에서 배송지를 먼저 저장해 주세요.</span>}
        </div>
      </form>
    </details>
  );
}
