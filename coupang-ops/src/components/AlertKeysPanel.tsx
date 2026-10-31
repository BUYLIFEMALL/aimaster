"use client";

import { useState, useTransition } from "react";
import { ConsoleLink, IssueLink } from "@/components/PlatformLinks";
import { connectTelegramAction, saveCronKeyAction, saveResendKeyAction, saveSolapiAction, testChannelAction, type AlertStatus } from "@/lib/actions/dailyAlert";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const ok = (on: boolean) => (on ? "✅" : "⬜");

/** 아침 요약에 쓰는 회원 본인 연동값. 켜기·끄기와 받을 곳 선택은 DailyAlertPanel */
export function AlertKeysPanel({ status }: { status: AlertStatus }) {
  const [botToken, setBotToken] = useState("");
  const [cronKey, setCronKey] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [emailTo, setEmailTo] = useState(status.emailTo);
  const [solapi, setSolapi] = useState({ apiKey: "", apiSecret: "", senderPhone: "", pfId: "" });
  const [note, setNote] = useState({ at: "", text: "" });
  const [pending, start] = useTransition();

  const run = (at: string, work: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const r = await work();
      setNote({ at, text: r.ok ? `✅ ${r.message}` : `❌ ${r.error}` });
      if (r.ok) after?.();
    });

  // 결과는 누른 버튼이 있는 칸 바로 아래에 보여 준다
  const noteOf = (at: string) => note.at === at && <p role="status" className="text-[13px] font-bold text-slate-800">{note.text}</p>;

  return (
    <>
      <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{ok(!!status.telegram)} 5. 아침 요약 받을 곳: 텔레그램 {status.telegram && <span className="text-sm font-bold text-teal-700">({status.telegram})</span>}</h2>
          <div className="flex flex-wrap items-center gap-1.5"><IssueLink href="https://t.me/BotFather" label="봇 만들기" /></div>
        </div>
        <p className="text-[13px] text-slate-600">텔레그램 BotFather에서 본인 봇을 만들고, 그 봇에게 아무 메시지나 보낸 뒤 토큰을 넣어 주세요. 다른 프로그램에서 연결한 봇이 있으면 그대로 씁니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="텔레그램 봇 토큰" placeholder={status.telegram ? "저장됨 — 바꿀 때만 입력" : "봇 토큰"} value={botToken} onChange={(e) => setBotToken(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !botToken.trim()} onClick={() => run("telegram", () => connectTelegramAction(botToken), () => setBotToken(""))} className={line}>연결</button>
          <button type="button" disabled={pending || !status.telegram} onClick={() => run("telegram", () => testChannelAction("telegram"))} className={line}>시험 메시지</button>
        </div>
        {noteOf("telegram")}
      </section>

      <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{ok(status.ready.email)} 6. 아침 요약 받을 곳: 이메일(Resend)</h2>
          <div className="flex flex-wrap items-center gap-1.5"><IssueLink href="https://resend.com/api-keys" /><ConsoleLink href="https://resend.com/signup" label="가입" /></div>
        </div>
        <p className="text-[13px] text-slate-600">내 Resend 키로 보냅니다. 무료 요금은 하루 100통이고, <b>Resend에 가입한 메일 주소로만</b> 받을 수 있습니다. 다른 프로그램에 등록한 키가 있으면 그대로 씁니다.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Resend API 키" type="password" autoComplete="new-password" placeholder={status.resendKeySaved ? "저장됨 — 바꿀 때만 입력" : "re_... 로 시작하는 본인 키"} value={resendKey} onChange={(e) => setResendKey(e.target.value)} className={field} />
          <input aria-label="받는 메일 주소" type="email" placeholder="Resend에 가입한 메일 주소" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className={field} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || (!resendKey.trim() && !status.resendKeySaved)} onClick={() => run("email", () => saveResendKeyAction({ apiKey: resendKey, emailTo }), () => setResendKey(""))} className={line}>저장</button>
          <button type="button" disabled={pending || !status.ready.email} onClick={() => run("email", () => testChannelAction("email"))} className={line}>시험 메일</button>
        </div>
        {noteOf("email")}
      </section>

      <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{ok(status.ready.kakao)} 7. 아침 요약 받을 곳: 카카오톡 {status.phoneMasked && <span className="text-sm font-bold text-teal-700">(받는 번호 {status.phoneMasked})</span>}</h2>
          <div className="flex flex-wrap items-center gap-1.5"><IssueLink href="https://console.solapi.com/credentials" /><ConsoleLink href="https://console.solapi.com/" label="SOLAPI 콘솔" /></div>
        </div>
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

      <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">{ok(status.cronKeySaved)} 8. 아침 요약 예약 키(cron-job.org)</h2>
          <div className="flex flex-wrap items-center gap-1.5"><IssueLink href="https://console.cron-job.org/settings" /><ConsoleLink href="https://console.cron-job.org/signup" label="가입" /></div>
        </div>
        <p className="text-[13px] text-slate-600">무료 cron-job.org에 가입한 뒤 Settings의 API 키를 넣어 주세요. IP 제한은 걸지 마세요. 키를 넣으면 프로그램이 매일 1번 실행 작업을 만들어 줍니다.</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" autoComplete="off" aria-label="cron-job.org API 키" placeholder={status.cronKeySaved ? "저장됨 — 바꿀 때만 입력" : "API 키"} value={cronKey} onChange={(e) => setCronKey(e.target.value)} className={`${field} min-w-0 flex-1`} />
          <button type="button" disabled={pending || !cronKey.trim()} onClick={() => run("cron", () => saveCronKeyAction(cronKey), () => setCronKey(""))} className={line}>저장</button>
        </div>
        {noteOf("cron")}
      </section>
    </>
  );
}
