"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { disableDailyAlertAction, enableDailyAlertAction, type AlertStatus } from "@/lib/actions/dailyAlert";
import { ALERT_CHANNELS, CHANNEL_LABEL, SUMMARY_CALLS_PER_DAY, type AlertChannel } from "@/lib/coupang/summary";

const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const ok = (on: boolean) => (on ? "✅" : "⬜");

export function DailyAlertPanel({ status }: { status: AlertStatus }) {
  const [hour, setHour] = useState(status.hour);
  const [channels, setChannels] = useState<AlertChannel[]>(status.channels);
  const toggle = (c: AlertChannel) => setChannels((old) => (old.includes(c) ? old.filter((x) => x !== c) : [...old, c]));
  const [note, setNote] = useState({ at: "", text: "" });
  const [pending, start] = useTransition();
  const ready = status.wingKeysSaved && status.cronKeySaved && channels.length > 0 && channels.every((c) => status.ready[c]);

  const run = (at: string, work: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const r = await work();
      setNote({ at, text: r.ok ? `✅ ${r.message}` : `❌ ${r.error}` });
      if (r.ok) after?.();
    });

  // 결과는 누른 버튼이 있는 칸 바로 아래에 보여 준다(맨 아래 한 곳이면 위쪽 칸에서 보이지 않는다)
  const noteOf = (at: string) => note.at === at && <p role="status" className="text-[13px] font-bold text-slate-800">{note.text}</p>;

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-slate-600">텔레그램, 이메일, 카카오톡, 예약 키는 <Link href="/connect" className="font-bold text-blue-700 underline">🔑 API키등록·플랫폼연동</Link> 5~8번 칸에서 등록합니다.</p>
      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.enabled)} 아침 요약 {status.enabled ? `켜짐 · 매일 ${status.hour}시` : "꺼짐"}</h2>
        <p className="text-[13px] text-slate-600">출고중지 요청, 미답변 문의, 결제완료, 상품준비중, 반품 접수, 교환 건수를 고른 곳으로 보냅니다. 건수만 보내고 고객 정보는 보내지 않으며, 쿠팡에는 읽기만 합니다.</p>
        <p className="text-[12px] text-amber-800">⚠ 한 번에 쿠팡을 {SUMMARY_CALLS_PER_DAY}번 읽습니다(한 달 약 {SUMMARY_CALLS_PER_DAY * 30}회). 내 Fixie 사용량에서 차감됩니다(무료 요금 월 500회).</p>
        {!status.wingKeysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
        <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-700">
          {ALERT_CHANNELS.map((c) => (
            <label key={c} className={`flex items-center gap-1.5 ${status.ready[c] ? "" : "text-slate-400"}`}>
              <input type="checkbox" disabled={!status.ready[c]} checked={channels.includes(c) && status.ready[c]} onChange={() => toggle(c)} />
              {CHANNEL_LABEL[c]}{status.ready[c] ? "" : "(연결 필요)"}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-700">보낼 시각
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </label>
          <button type="button" disabled={pending || !ready} onClick={() => run("summary", () => enableDailyAlertAction(hour, channels))} className={primary}>{status.enabled ? "설정 바꾸기" : "켜기"}</button>
          {status.enabled && <button type="button" disabled={pending} onClick={() => run("summary", disableDailyAlertAction)} className={line}>끄기</button>}
        </div>
        {status.lastRunDate && <p className="text-[12px] text-slate-500">마지막 실행 {status.lastRunDate}: {status.lastResult || "처리 중"}</p>}
        {noteOf("summary")}
      </section>
    </div>
  );
}
