"use client";

import { useState, useTransition } from "react";
import { connectTelegramAction, disableDailyAlertAction, enableDailyAlertAction, saveCronKeyAction, testTelegramAction, type AlertStatus } from "@/lib/actions/dailyAlert";
import { SUMMARY_CALLS_PER_DAY } from "@/lib/coupang/summary";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const ok = (on: boolean) => (on ? "✅" : "⬜");

export function DailyAlertPanel({ status }: { status: AlertStatus }) {
  const [botToken, setBotToken] = useState("");
  const [cronKey, setCronKey] = useState("");
  const [hour, setHour] = useState(status.hour);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const ready = status.wingKeysSaved && !!status.telegram && status.cronKeySaved;

  const run = (work: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const r = await work();
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      if (r.ok) after?.();
    });

  return (
    <div className="space-y-5">
      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(!!status.telegram)} 1. 텔레그램 연결 {status.telegram && <span className="text-sm font-bold text-teal-700">({status.telegram})</span>}</h2>
        <p className="text-[13px] text-slate-600">텔레그램 BotFather에서 본인 봇을 만들고, 그 봇에게 아무 메시지나 보낸 뒤 토큰을 넣어 주세요. 다른 프로그램에서 연결한 봇이 있으면 그대로 씁니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="텔레그램 봇 토큰" placeholder="봇 토큰" value={botToken} onChange={(e) => setBotToken(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !botToken.trim()} onClick={() => run(() => connectTelegramAction(botToken), () => setBotToken(""))} className={line}>연결</button>
          <button type="button" disabled={pending || !status.telegram} onClick={() => run(testTelegramAction)} className={line}>시험 메시지</button>
        </div>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.cronKeySaved)} 2. cron-job.org API 키</h2>
        <p className="text-[13px] text-slate-600">무료 cron-job.org에 가입한 뒤 Settings의 API 키를 넣어 주세요. IP 제한은 걸지 마세요. 키를 넣으면 프로그램이 매일 1번 실행 작업을 만들어 줍니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="cron-job.org API 키" placeholder={status.cronKeySaved ? "저장됨 — 바꿀 때만 입력" : "API 키"} value={cronKey} onChange={(e) => setCronKey(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !cronKey.trim()} onClick={() => run(() => saveCronKeyAction(cronKey), () => setCronKey(""))} className={line}>저장</button>
        </div>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.enabled)} 3. 아침 요약 {status.enabled ? `켜짐 · 매일 ${status.hour}시` : "꺼짐"}</h2>
        <p className="text-[13px] text-slate-600">출고중지 요청, 미답변 문의, 결제완료, 상품준비중, 반품 접수, 교환 건수를 텔레그램으로 보냅니다. 건수만 보내고 고객 정보는 보내지 않으며, 쿠팡에는 읽기만 합니다.</p>
        <p className="text-[12px] text-amber-800">⚠ 한 번에 쿠팡을 {SUMMARY_CALLS_PER_DAY}번 읽습니다(한 달 약 {SUMMARY_CALLS_PER_DAY * 30}회). 호출 상한에 닿으면 그날 요약은 쉬고 알려 드립니다.</p>
        {!status.wingKeysSaved && <p className="text-xs text-amber-800">먼저 「쿠팡 연결」에서 키를 저장해 주세요.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-700">보낼 시각
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </label>
          <button type="button" disabled={pending || !ready} onClick={() => run(() => enableDailyAlertAction(hour))} className={primary}>{status.enabled ? "시각 바꾸기" : "켜기"}</button>
          {status.enabled && <button type="button" disabled={pending} onClick={() => run(disableDailyAlertAction)} className={line}>끄기</button>}
        </div>
        {status.lastRunDate && <p className="text-[12px] text-slate-500">마지막 실행 {status.lastRunDate}: {status.lastResult || "처리 중"}</p>}
      </section>
      {note && <p className="text-[13px] text-slate-800">{note}</p>}
    </div>
  );
}
