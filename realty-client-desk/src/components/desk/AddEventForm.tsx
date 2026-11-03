"use client";

import { useActionState, useState } from "react";
import { addEventAction, type EventState } from "@/lib/actions/events";
import { DEFAULT_NOTIFY_DAYS, EVENT_KINDS, type EventKind } from "@/lib/desk/eventRules";

const field = "mb-1 block text-xs font-semibold text-mx-muted";

// 3단계(2026-11-03): 일정 넣기. 「며칠 전 알림」은 종류별 기본값이 들어가고 고칠 수 있다(만기는 60일 전 — 갱신 상담).
export function AddEventForm({ today, clients, listings }: { today: string; clients: { id: string; name: string }[]; listings: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<EventState, FormData>(addEventAction, {});
  const [kind, setKind] = useState<EventKind>("임장");
  return (
    <details className="mx-card p-5" open={Boolean(state.error)}>
      <summary className="cursor-pointer text-base font-bold text-mx-text">➕ 일정 넣기</summary>
      <form action={action} key={state.success ?? "form"} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={field}>종류 *</span>
            <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as EventKind)} className="mx-input">{EVENT_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          <label><span className={field}>일정 이름 *</span>
            <input name="title" required maxLength={60} placeholder="예: 백석동 84㎡ 잔금" className="mx-input" /></label>
          <label><span className={field}>날짜 *</span>
            <input name="day" type="date" required min={today} defaultValue={today} className="mx-input" /></label>
          <label><span className={field}>시각</span>
            <input name="time" type="time" defaultValue="10:00" className="mx-input" /></label>
          <label><span className={field}>며칠 전 아침 8시에 알릴까요? (0 = 당일)</span>
            <input key={kind} name="notifyDays" type="number" min={0} max={90} defaultValue={DEFAULT_NOTIFY_DAYS[kind]} className="mx-input" /></label>
          <label><span className={field}>고객 (선택)</span>
            <select name="clientId" defaultValue="" className="mx-input"><option value="">고르지 않음</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={field}>매물 (선택)</span>
            <select name="listingId" defaultValue="" className="mx-input"><option value="">고르지 않음</option>{listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
        </div>
        <label className="block"><span className={field}>메모</span><textarea name="memo" maxLength={500} rows={2} className="mx-input" /></label>
        {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
        {state.warning && <p className="rounded-lg bg-[#fff4e5] p-3 text-sm text-[#8a5300]">⚠️ {state.warning}</p>}
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "일정 저장"}</button>
      </form>
    </details>
  );
}
