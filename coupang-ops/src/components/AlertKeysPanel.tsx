"use client";

import { useState, useTransition } from "react";
import { CopyBox } from "@/components/CopyBox";
import { KAKAO_REDIRECT_URI } from "@/lib/kakao/oauth";
import { connectTelegramAction, saveCronKeyAction, saveResendKeyAction, saveKakaoKeysAction, startKakaoConnectAction, testChannelAction, type AlertStatus } from "@/lib/actions/dailyAlert";

// 아침 요약에 쓰는 회원 본인 연동값 입력칸. 연동 표(SetupTable)의 줄 아래에 펼쳐진다. 켜기·끄기와 받을 곳 선택은 DailyAlertPanel
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const hint = "text-[13px] text-slate-600";
type Done = { ok: true; message: string } | { ok: false; error: string };

function useRun() {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const run = (work: () => Promise<Done>, after?: () => void) =>
    start(async () => {
      const r = await work();
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      if (r.ok) after?.();
    });
  // 결과는 누른 버튼 바로 아래에 보여 준다
  const noteLine = note && <p role="status" className="text-[13px] font-bold text-slate-800">{note}</p>;
  return { run, pending, noteLine, setNote, start };
}

export function TelegramForm({ status }: { status: AlertStatus }) {
  const { run, pending, noteLine } = useRun();
  const [botToken, setBotToken] = useState("");
  return (
    <div className="space-y-2">
      <p className={hint}>텔레그램 BotFather에서 본인 봇을 만들고, 그 봇에게 아무 메시지나 보낸 뒤 토큰을 넣어 주세요. 다른 프로그램에서 연결한 봇이 있으면 그대로 씁니다.</p>
      <div className="flex flex-wrap gap-2">
        <input type="password" autoComplete="off" aria-label="텔레그램 봇 토큰" placeholder={status.telegram ? "저장됨 — 바꿀 때만 입력" : "봇 토큰"} value={botToken} onChange={(e) => setBotToken(e.target.value)} className={`${field} min-w-0 flex-1`} />
        <button type="button" disabled={pending || !botToken.trim()} onClick={() => run(() => connectTelegramAction(botToken), () => setBotToken(""))} className={line}>연결</button>
        <button type="button" disabled={pending || !status.telegram} onClick={() => run(() => testChannelAction("telegram"))} className={line}>시험 메시지</button>
      </div>
      {noteLine}
    </div>
  );
}

export function ResendForm({ status }: { status: AlertStatus }) {
  const { run, pending, noteLine } = useRun();
  const [resendKey, setResendKey] = useState("");
  const [emailTo, setEmailTo] = useState(status.emailTo);
  return (
    <div className="space-y-2">
      <p className={hint}>내 Resend 키로 보냅니다. 무료 요금은 하루 100통이고, <b>Resend에 가입한 메일 주소로만</b> 받을 수 있습니다. 다른 프로그램에 등록한 키가 있으면 그대로 씁니다.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Resend API 키" type="password" autoComplete="new-password" placeholder={status.resendKeySaved ? "저장됨 — 바꿀 때만 입력" : "re_... 로 시작하는 본인 키"} value={resendKey} onChange={(e) => setResendKey(e.target.value)} className={field} />
        <input aria-label="받는 메일 주소" type="email" placeholder="Resend에 가입한 메일 주소" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className={field} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || (!resendKey.trim() && !status.resendKeySaved)} onClick={() => run(() => saveResendKeyAction({ apiKey: resendKey, emailTo }), () => setResendKey(""))} className={line}>저장</button>
        <button type="button" disabled={pending || !status.ready.email} onClick={() => run(() => testChannelAction("email"))} className={line}>시험 메일</button>
      </div>
      {noteLine}
    </div>
  );
}

export function KakaoForm({ status }: { status: AlertStatus }) {
  const { run, pending, noteLine, setNote, start } = useRun();
  const [keys, setKeys] = useState({ restKey: "", secret: "" });
  const connect = () =>
    start(async () => {
      const r = await startKakaoConnectAction();
      if (!r.ok) return setNote(`❌ ${r.error}`);
      window.location.href = r.url;
    });
  return (
    <div className="space-y-2">
      <p className={hint}>내 카카오 앱으로 카카오톡 「나와의 채팅」에 무료로 보냅니다. 200자까지 들어가 긴 내용은 잘릴 수 있습니다. 다른 프로그램과 같은 카카오 앱이면 그 연결을 그대로 씁니다.</p>
      <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-700">
        <li>카카오 개발자에서 내 앱의 <b>REST API 키</b>를 아래에 저장합니다. 클라이언트 시크릿을 켰다면 함께 넣습니다.</li>
        <li>카카오 로그인 Redirect URI에 아래 주소를 추가하고, 동의항목에서 <b>카카오톡 메시지 전송</b>을 켭니다.</li>
        <li><b>카카오 연결하기</b>를 누르고 동의합니다.</li>
      </ol>
      <CopyBox label="Redirect URI" text={KAKAO_REDIRECT_URI} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="카카오 REST API 키" type="password" autoComplete="off" placeholder={status.kakaoHasKey ? "저장됨 — 바꿀 때만 입력" : "REST API 키(영문·숫자 32자)"} value={keys.restKey} onChange={(e) => setKeys({ ...keys, restKey: e.target.value })} className={field} />
        <input aria-label="카카오 클라이언트 시크릿" type="password" autoComplete="new-password" placeholder="클라이언트 시크릿(쓰는 경우만)" value={keys.secret} onChange={(e) => setKeys({ ...keys, secret: e.target.value })} className={field} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || !keys.restKey.trim()} onClick={() => run(() => saveKakaoKeysAction(keys), () => setKeys({ restKey: "", secret: "" }))} className={line}>저장</button>
        <button type="button" disabled={pending || !status.kakaoHasKey} onClick={connect} className={line}>{status.kakaoOk ? "다시 연결" : "카카오 연결하기"}</button>
        <button type="button" disabled={pending || !status.ready.kakao} onClick={() => run(() => testChannelAction("kakao"))} className={line}>시험 메시지</button>
      </div>
      {noteLine}
    </div>
  );
}

export function CronForm({ status }: { status: AlertStatus }) {
  const { run, pending, noteLine } = useRun();
  const [cronKey, setCronKey] = useState("");
  return (
    <div className="space-y-2">
      <p className={hint}>무료 cron-job.org에 가입한 뒤 Settings의 API 키를 넣어 주세요. IP 제한은 걸지 마세요. 키를 넣으면 프로그램이 매일 1번 실행 작업을 만들어 줍니다.</p>
      <div className="flex flex-wrap gap-2">
        <input type="password" autoComplete="off" aria-label="cron-job.org API 키" placeholder={status.cronKeySaved ? "저장됨 — 바꿀 때만 입력" : "API 키"} value={cronKey} onChange={(e) => setCronKey(e.target.value)} className={`${field} min-w-0 flex-1`} />
        <button type="button" disabled={pending || !cronKey.trim()} onClick={() => run(() => saveCronKeyAction(cronKey), () => setCronKey(""))} className={line}>저장</button>
      </div>
      {noteLine}
    </div>
  );
}
