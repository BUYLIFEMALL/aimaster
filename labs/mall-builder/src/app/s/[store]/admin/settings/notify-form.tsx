"use client";

import { useActionState, useState, useTransition } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { NOTIFY_KINDS } from "@/lib/notify";
import { balanceAction, saveNotifyAction, sendTestSmsAction, type NotifyState } from "./notify-actions";

export type NotifyStatus = {
  hasKey: boolean;
  hasCronKey: boolean;
  sender: string;
  staff: string;
  kinds: string[];
  linked: boolean;
  paused: boolean;
};

export default function NotifyForm({ slug, status }: { slug: string; status: NotifyStatus }) {
  const initial: NotifyState = { error: null, message: null, sender: status.sender, staff: status.staff, kinds: status.kinds };
  const [state, formAction, pending] = useActionState(saveNotifyAction.bind(null, slug), initial);
  const [extra, setExtra] = useState<{ error: string | null; message: string | null }>({ error: null, message: null });
  const [busy, startBusy] = useTransition();
  const [armed, setArmed] = useState(false); // 시험 문자는 유료라 두 번 눌러야 보낸다

  const on = status.kinds.length > 0;
  const label = !on ? "꺼짐" : !status.hasCronKey || !status.linked ? "대기(cron-job.org 키 필요)" : status.paused ? "일시정지" : "켜짐";

  function testSms() {
    if (!armed) {
      setArmed(true);
      setExtra({ error: null, message: "알림 받을 번호로 시험 문자 1건을 보냅니다(솔라피 요금 차감). 보내려면 버튼을 한 번 더 눌러 주세요." });
      return;
    }
    setArmed(false);
    setExtra({ error: null, message: null });
    startBusy(async () => setExtra(await sendTestSmsAction(slug)));
  }
  function balance() {
    setExtra({ error: null, message: null });
    startBusy(async () => {
      const r = await balanceAction(slug);
      setExtra({ error: r.error, message: r.text });
    });
  }

  return (
    <fieldset className="rounded-lg border p-4" data-order-notify>
      <legend className="px-1 text-sm font-semibold">주문 알림(문자)</legend>
      <p className="text-sm text-gray-600">
        주문이 들어오거나 상태가 바뀌면 운영자님·손님에게 문자를 보냅니다. 운영자님 본인 솔라피 계정으로 보내며 요금도 그 계정에서 나갑니다. 확인은 위 cron-job.org 작업이 1분마다 합니다.
      </p>
      <p className="mt-2 text-sm" data-notify-status>상태 <b>{label}</b></p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">솔라피 API 키 {status.hasKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}</span>
          <input name="api_key" type="password" autoComplete="off" maxLength={200} placeholder={status.hasKey ? "••••••••" : "솔라피 콘솔 → API Key 관리"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">솔라피 API 시크릿</span>
          <input name="api_secret" type="password" autoComplete="off" maxLength={200} placeholder={status.hasKey ? "••••••••" : "키와 함께 입력"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">발신번호(솔라피에 등록한 번호)</span>
          <input name="sender_phone" defaultValue={state.sender} inputMode="tel" maxLength={20} placeholder="예: 02-1234-5678" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">알림 받을 번호(운영자 핸드폰)</span>
          <input name="staff_phone" defaultValue={state.staff} inputMode="tel" maxLength={20} placeholder="예: 010-1234-5678" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <p className="text-sm">보낼 알림</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {NOTIFY_KINDS.map((k) => (
              <label key={k.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="kinds" value={k.key} defaultChecked={state.kinds.includes(k.key)} className="mt-1" />
                <span>
                  {k.label} <span className="text-gray-500">— {k.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        {status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_key" /> 등록한 솔라피 키 지우기
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
            {pending ? "저장 중…" : "알림 저장"}
          </button>
          {status.hasKey && (
            <>
              <button type="button" onClick={testSms} disabled={busy} className="min-h-11 rounded border px-5 py-2 disabled:opacity-50" data-test-sms>
                {armed ? "한 번 더 누르면 보냅니다" : "시험 문자 보내기"}
              </button>
              <button type="button" onClick={balance} disabled={busy} className="min-h-11 rounded border px-5 py-2 disabled:opacity-50">
                솔라피 잔액 보기
              </button>
            </>
          )}
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      {extra.error && <p className="mt-2 text-sm text-red-600" data-notify-extra-error>{extra.error}</p>}
      {extra.message && <p className="mt-2 text-sm text-green-700" data-notify-extra>{extra.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        키는 솔라피 콘솔(console.solapi.com) → 개발/연동 → API Key 관리에서 만들 수 있습니다. 발신번호는 솔라피에 미리 등록된 번호만 쓸 수 있습니다. 손님에게는 주문서의 「받는 분 핸드폰」으로 보냅니다. 같은 주문의 같은 알림은 한 번만 보내고, 보냈는지 확실하지 않은 문자는 다시 보내지 않습니다(이중 요금 방지). 일시정지는 위 「입금 기한 자동 취소」 칸의 버튼과 같습니다.
      </p>
    </fieldset>
  );
}
