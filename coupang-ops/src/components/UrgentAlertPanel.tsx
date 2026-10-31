"use client";

import { useState, useTransition } from "react";
import { disableUrgentAlertAction, enableUrgentAlertAction, type AlertStatus } from "@/lib/actions/dailyAlert";
import { ALERT_CHANNELS, CHANNEL_LABEL, URGENT_CALLS_PER_RUN, URGENT_HOURS, type AlertChannel } from "@/lib/coupang/summary";

const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";

/** R10 출고중지·미답변 문의 수시 알림. 읽기만 하고, 건수가 늘었을 때만 보낸다 */
export function UrgentAlertPanel({ status }: { status: AlertStatus }) {
  const u = status.urgent;
  const [channels, setChannels] = useState<AlertChannel[]>(u.channels.length ? u.channels : status.channels);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toggle = (c: AlertChannel) => setChannels((old) => (old.includes(c) ? old.filter((x) => x !== c) : [...old, c]));
  const ready = status.wingKeysSaved && status.cronKeySaved && channels.length > 0 && channels.every((c) => status.ready[c]);
  const monthly = URGENT_HOURS.length * URGENT_CALLS_PER_RUN * 30;

  const run = (work: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) =>
    start(async () => {
      const r = await work();
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <h2 className="text-base font-extrabold text-slate-900">{u.enabled ? "✅" : "⬜"} 출고중지·미답변 문의 수시 알림 {u.enabled ? "켜짐 · 오전 9시, 오후 6시" : "꺼짐"}</h2>
      <p className="text-[13px] text-slate-600">매일 오전 9시와 오후 6시에 출고중지 요청과 미답변 문의를 확인해, <b>이전보다 늘었을 때만</b> 보냅니다. 건수만 보내고 고객 정보는 보내지 않으며, 쿠팡에는 읽기만 합니다.</p>
      <p className="text-[12px] text-amber-800">⚠ 쿠팡 호출이 한 달 약 {monthly}회 늘어납니다. Fixie 무료 요금은 월 500회이고 아침 요약과 함께 차감됩니다.</p>
      <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-700">
        {ALERT_CHANNELS.map((c) => (
          <label key={c} className={`flex items-center gap-1.5 ${status.ready[c] ? "" : "text-slate-400"}`}>
            <input type="checkbox" disabled={!status.ready[c]} checked={channels.includes(c) && status.ready[c]} onChange={() => toggle(c)} />
            {CHANNEL_LABEL[c]}{status.ready[c] ? "" : "(연결 필요)"}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !ready} onClick={() => run(() => enableUrgentAlertAction(channels))} className={primary}>{u.enabled ? "설정 바꾸기" : "켜기"}</button>
        {u.enabled && <button type="button" disabled={pending} onClick={() => run(disableUrgentAlertAction)} className={line}>끄기</button>}
      </div>
      {u.lastResult && <p className="text-[12px] text-slate-500">마지막 확인: {u.lastResult}</p>}
      {note && <p role="status" className="text-[13px] font-bold text-slate-800">{note}</p>}
    </section>
  );
}
