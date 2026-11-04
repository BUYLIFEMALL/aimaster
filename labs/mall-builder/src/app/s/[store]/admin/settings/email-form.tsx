"use client";

import { useActionState, useState, useTransition } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { NOTIFY_KINDS } from "@/lib/notify";
import { saveEmailAction, sendTestEmailAction, type EmailState } from "./email-actions";

export type EmailStatus = { hasKey: boolean; hasCronKey: boolean; from: string; staff: string; kinds: string[]; linked: boolean; paused: boolean };

export default function EmailForm({ slug, status }: { slug: string; status: EmailStatus }) {
  const initial: EmailState = { error: null, message: null, from: status.from, staff: status.staff, kinds: status.kinds };
  const [state, formAction, pending] = useActionState(saveEmailAction.bind(null, slug), initial);
  const [extra, setExtra] = useState<{ error: string | null; message: string | null }>({ error: null, message: null });
  const [busy, startBusy] = useTransition();

  const on = status.kinds.length > 0;
  const label = !on ? "꺼짐" : !status.hasCronKey || !status.linked ? "대기(cron-job.org 키 필요)" : status.paused ? "일시정지" : "켜짐";

  function testEmail() {
    setExtra({ error: null, message: null });
    startBusy(async () => setExtra(await sendTestEmailAction(slug)));
  }

  return (
    <fieldset className="rounded-lg border p-4" data-order-email>
      <legend className="px-1 text-sm font-semibold">주문 알림(메일)</legend>
      <p className="text-sm text-gray-600">
        문자와 같은 때에 메일도 보냅니다. 운영자님 본인 Resend(무료: 하루 100통) 계정으로 보내며, Resend에서 도메인 인증을 마친 주소로만 보낼 수 있습니다. 손님에게는 주문한 손님의 로그인 메일로 보냅니다.
      </p>
      <p className="mt-2 text-sm" data-email-status>상태 <b>{label}</b></p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm">Resend API 키 {status.hasKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}</span>
          <input name="resend_key" type="password" autoComplete="off" maxLength={200} placeholder={status.hasKey ? "••••••••" : "re_로 시작하는 키"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">보내는 주소(인증한 도메인)</span>
          <input name="email_from" defaultValue={state.from} type="email" maxLength={200} placeholder="예: order@mail.내도메인.com" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">운영자가 받을 메일</span>
          <input name="staff_email" defaultValue={state.staff} type="email" maxLength={200} placeholder="예: me@example.com" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <p className="text-sm">보낼 메일</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {NOTIFY_KINDS.map((k) => (
              <label key={k.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="email_kinds" value={k.key} defaultChecked={state.kinds.includes(k.key)} className="mt-1" />
                <span>
                  {k.label} <span className="text-gray-500">— {k.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        {status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_resend_key" /> 등록한 Resend 키 지우기
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
            {pending ? "저장 중…" : "메일 알림 저장"}
          </button>
          {status.hasKey && (
            <button type="button" onClick={testEmail} disabled={busy} className="min-h-11 rounded border px-5 py-2 disabled:opacity-50" data-test-email>
              {busy ? "보내는 중…" : "시험 메일 보내기"}
            </button>
          )}
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      {extra.error && <p className="mt-2 text-sm text-red-600" data-email-extra-error>{extra.error}</p>}
      {extra.message && <p className="mt-2 text-sm text-green-700" data-email-extra>{extra.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        준비: resend.com 가입 → API Keys에서 키 만들기 → Domains에 하위 도메인(예: mail.내도메인.com) 추가 → 안내된 DNS 기록을 도메인 관리 화면(Cloudflare 등)에 넣기(CNAME은 프록시 끄기) → Verified 확인. 같은 주문의 같은 메일은 한 번만 보내고, 결과가 불확실하면 Resend 중복 방지 키로 한 번만 다시 보냅니다.
      </p>
    </fieldset>
  );
}
