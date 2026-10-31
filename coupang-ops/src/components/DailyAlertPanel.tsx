"use client";

import { useState, useTransition } from "react";
import { connectTelegramAction, disableDailyAlertAction, enableDailyAlertAction, saveCronKeyAction, saveSmtpAction, saveSolapiAction, testChannelAction, type AlertStatus } from "@/lib/actions/dailyAlert";
import { ALERT_CHANNELS, CHANNEL_LABEL, SUMMARY_CALLS_PER_DAY, type AlertChannel } from "@/lib/coupang/summary";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const ok = (on: boolean) => (on ? "✅" : "⬜");

export function DailyAlertPanel({ status }: { status: AlertStatus }) {
  const [botToken, setBotToken] = useState("");
  const [cronKey, setCronKey] = useState("");
  const [hour, setHour] = useState(status.hour);
  const [channels, setChannels] = useState<AlertChannel[]>(status.channels);
  const [smtp, setSmtp] = useState({ host: "smtp.gmail.com", port: "587", user: "", password: "", fromName: "" });
  const [solapi, setSolapi] = useState({ apiKey: "", apiSecret: "", senderPhone: "", pfId: "" });
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
      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(!!status.telegram)} 1. 텔레그램 연결 {status.telegram && <span className="text-sm font-bold text-teal-700">({status.telegram})</span>}</h2>
        <p className="text-[13px] text-slate-600">텔레그램 BotFather에서 본인 봇을 만들고, 그 봇에게 아무 메시지나 보낸 뒤 토큰을 넣어 주세요. 다른 프로그램에서 연결한 봇이 있으면 그대로 씁니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="텔레그램 봇 토큰" placeholder={status.telegram ? "저장됨 — 바꿀 때만 입력" : "봇 토큰"} value={botToken} onChange={(e) => setBotToken(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !botToken.trim()} onClick={() => run("telegram", () => connectTelegramAction(botToken), () => setBotToken(""))} className={line}>연결</button>
          <button type="button" disabled={pending || !status.telegram} onClick={() => run("telegram", () => testChannelAction("telegram"))} className={line}>시험 메시지</button>
        </div>
        {noteOf("telegram")}
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.ready.email)} 1-2. 이메일 {status.smtpUser && <span className="text-sm font-bold text-teal-700">({status.smtpUser} → {status.email})</span>}</h2>
        <p className="text-[13px] text-slate-600">내 메일 계정의 SMTP로 내 가입 메일 주소에 보냅니다. Gmail은 일반 비밀번호가 아니라 앱 비밀번호를 넣어 주세요. 다른 프로그램에 등록한 계정이 있으면 그대로 씁니다.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input aria-label="SMTP 주소" placeholder="SMTP 주소" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} className={field} />
          <input aria-label="SMTP 포트" placeholder="포트" inputMode="numeric" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} className={field} />
          <input aria-label="SMTP 로그인 계정" autoComplete="off" placeholder="로그인 계정(메일 주소)" value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} className={field} />
          <input aria-label="SMTP 앱 비밀번호" type="password" autoComplete="new-password" placeholder={status.ready.email ? "저장됨 — 바꿀 때만 입력" : "앱 비밀번호"} value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} className={field} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || !smtp.user.trim() || !smtp.password.trim()} onClick={() => run("email", () => saveSmtpAction({ ...smtp, port: Number(smtp.port) }), () => setSmtp({ ...smtp, user: "", password: "" }))} className={line}>저장</button>
          <button type="button" disabled={pending || !status.ready.email} onClick={() => run("email", () => testChannelAction("email"))} className={line}>시험 메일</button>
        </div>
        {noteOf("email")}
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.ready.kakao)} 1-3. 카카오톡 {status.phoneMasked && <span className="text-sm font-bold text-teal-700">(받는 번호 {status.phoneMasked})</span>}</h2>
        <p className="text-[13px] text-slate-600">내 SOLAPI 계정으로 내 가입 핸드폰에 친구톡(브랜드 메시지)을 보냅니다. 내 카카오 채널을 친구로 추가해 두어야 받을 수 있고, 건당 요금은 내 SOLAPI에 청구됩니다.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input aria-label="SOLAPI API Key" type="password" autoComplete="off" placeholder={status.ready.kakao ? "저장됨 — 바꿀 때만 입력" : "API Key"} value={solapi.apiKey} onChange={(e) => setSolapi({ ...solapi, apiKey: e.target.value })} className={field} />
          <input aria-label="SOLAPI API Secret" type="password" autoComplete="new-password" placeholder={status.ready.kakao ? "저장됨 — 바꿀 때만 입력" : "API Secret"} value={solapi.apiSecret} onChange={(e) => setSolapi({ ...solapi, apiSecret: e.target.value })} className={field} />
          <input aria-label="발신번호" inputMode="numeric" placeholder="등록된 발신번호" value={solapi.senderPhone} onChange={(e) => setSolapi({ ...solapi, senderPhone: e.target.value })} className={field} />
          <input aria-label="카카오 채널 ID" placeholder="카카오 채널 ID(pfId)" value={solapi.pfId} onChange={(e) => setSolapi({ ...solapi, pfId: e.target.value })} className={field} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || !solapi.apiKey.trim() || !solapi.apiSecret.trim()} onClick={() => run("kakao", () => saveSolapiAction(solapi), () => setSolapi({ apiKey: "", apiSecret: "", senderPhone: "", pfId: "" }))} className={line}>저장</button>
          <button type="button" disabled={pending || !status.ready.kakao} onClick={() => run("kakao", () => testChannelAction("kakao"))} className={line}>시험 메시지(내 SOLAPI 요금)</button>
        </div>
        {noteOf("kakao")}
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.cronKeySaved)} 2. cron-job.org API 키</h2>
        <p className="text-[13px] text-slate-600">무료 cron-job.org에 가입한 뒤 Settings의 API 키를 넣어 주세요. IP 제한은 걸지 마세요. 키를 넣으면 프로그램이 매일 1번 실행 작업을 만들어 줍니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="cron-job.org API 키" placeholder={status.cronKeySaved ? "저장됨 — 바꿀 때만 입력" : "API 키"} value={cronKey} onChange={(e) => setCronKey(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !cronKey.trim()} onClick={() => run("cron", () => saveCronKeyAction(cronKey), () => setCronKey(""))} className={line}>저장</button>
        </div>
        {noteOf("cron")}
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">{ok(status.enabled)} 3. 아침 요약 {status.enabled ? `켜짐 · 매일 ${status.hour}시` : "꺼짐"}</h2>
        <p className="text-[13px] text-slate-600">출고중지 요청, 미답변 문의, 결제완료, 상품준비중, 반품 접수, 교환 건수를 고른 곳으로 보냅니다. 건수만 보내고 고객 정보는 보내지 않으며, 쿠팡에는 읽기만 합니다.</p>
        <p className="text-[12px] text-amber-800">⚠ 한 번에 쿠팡을 {SUMMARY_CALLS_PER_DAY}번 읽습니다(한 달 약 {SUMMARY_CALLS_PER_DAY * 30}회). 호출 상한에 닿으면 그날 요약은 쉬고 알려 드립니다.</p>
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
