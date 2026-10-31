"use client";

import { useActionState, useState } from "react";
import { saveChannelSwitchesAction, saveKakaoKeysAction, saveResendKeyAction, sendTestEmailAction, sendTestKakaoAction, startKakaoConnectAction, type ChannelResult } from "@/lib/actions/channels";

const initial: ChannelResult = {};
const input = "mx-input min-h-[40px] py-2 text-sm";
const check = "flex min-h-[40px] items-center gap-2 rounded-lg border border-mx-border bg-white px-3 text-sm font-semibold text-mx-text";

function Note({ s }: { s: ChannelResult }) {
  return (
    <>
      {s.error && <p className="mt-2 text-sm text-mx-danger">{s.error}</p>}
      {s.success && <p className="mt-2 text-sm text-mx-success">{s.success}</p>}
    </>
  );
}

function TestButton({ run, label }: { run: () => Promise<ChannelResult>; label: string }) {
  const [s, setS] = useState<ChannelResult>({});
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="mx-btn-ghost min-h-[40px] text-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setS(await run());
          setBusy(false);
        }}
      >
        {busy ? "보내는 중..." : label}
      </button>
      <Note s={s} />
    </div>
  );
}

export function ChannelSwitches({ telegram, email, emailTo, kakao }: { telegram: boolean; email: boolean; emailTo: string; kakao: boolean }) {
  const [s, action, pending] = useActionState(saveChannelSwitchesAction, initial);
  return (
    <form action={action}>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_2fr_auto]">
        <label className={check}>
          <input type="checkbox" name="telegram" defaultChecked={telegram} /> 텔레그램
        </label>
        <label className={check}>
          <input type="checkbox" name="email" defaultChecked={email} /> 이메일
        </label>
        <label className={check}>
          <input type="checkbox" name="kakao" defaultChecked={kakao} /> 카카오톡
        </label>
        <input name="emailTo" type="email" defaultValue={emailTo} className={input} placeholder="받는 메일 주소(Resend 가입 메일)" aria-label="받는 메일 주소" />
        <button className="mx-btn-primary min-h-[40px] text-sm" disabled={pending}>
          저장
        </button>
      </div>
      <Note s={s} />
    </form>
  );
}

export function EmailCard({ hasKey }: { hasKey: boolean }) {
  const [s, action, pending] = useActionState(saveResendKeyAction, initial);
  return (
    <div className="space-y-3">
      <p className="text-sm text-mx-muted">본인 Resend 키로 보냅니다(무료 하루 100통). 무료 요금제는 가입한 메일 주소로만 받을 수 있어요. {hasKey ? "✅ 키 저장됨" : ""}</p>
      <form action={action} className="flex flex-wrap gap-2">
        <input name="resendKey" type="password" autoComplete="off" className={`${input} max-w-md flex-1`} placeholder="re_로 시작하는 Resend API 키" aria-label="Resend API 키" />
        <button className="mx-btn-primary min-h-[40px] text-sm" disabled={pending}>
          키 저장
        </button>
      </form>
      <Note s={s} />
      <TestButton run={sendTestEmailAction} label="시험 메일 보내기" />
    </div>
  );
}

export function KakaoCard({ hasKey, connected, message }: { hasKey: boolean; connected: boolean; message: string }) {
  const [s, action, pending] = useActionState(saveKakaoKeysAction, initial);
  const [err, setErr] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm text-mx-muted">
        본인 카카오 앱으로 「나와의 채팅」에 요약을 보냅니다. 카카오 앱의 Redirect URI에 <code className="break-all">https://commercial-land-trade-alert.buylife.xyz/api/kakao/callback</code>, 웹 도메인에 <code className="break-all">https://commercial-land-trade-alert.buylife.xyz</code>를 등록해 주세요.
      </p>
      <p className={`text-sm font-semibold ${connected ? "text-mx-success" : "text-mx-accent"}`}>{connected ? "✅ 카카오 연결됨" : message}</p>
      <form action={action} className="flex flex-wrap gap-2">
        <input name="kakaoRestKey" type="password" autoComplete="off" className={`${input} max-w-xs flex-1`} placeholder={hasKey ? "REST API 키 저장됨(바꿀 때만)" : "REST API 키"} aria-label="REST API 키" />
        <input name="kakaoSecret" type="password" autoComplete="off" className={`${input} max-w-xs flex-1`} placeholder="클라이언트 시크릿(켠 경우만)" aria-label="클라이언트 시크릿" />
        <button className="mx-btn-primary min-h-[40px] text-sm" disabled={pending}>
          키 저장
        </button>
      </form>
      <Note s={s} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="mx-btn-ghost min-h-[40px] text-sm"
          onClick={async () => {
            const r = await startKakaoConnectAction();
            if (r.url) window.location.href = r.url;
            else setErr(r.error ?? "연결을 시작하지 못했어요.");
          }}
        >
          💬 카카오 연결하기
        </button>
        <TestButton run={sendTestKakaoAction} label="시험 메시지 보내기" />
      </div>
      {err && <p className="text-sm text-mx-danger">{err}</p>}
    </div>
  );
}
