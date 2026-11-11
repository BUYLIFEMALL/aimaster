"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveRestockAction, type RestockState } from "./restock-actions";

export type RestockStatus = { sms: boolean; email: boolean; waiting: number };

// 재입고 알림(D16) — 품절 상품에 손님이 신청하면, 재고가 다시 생길 때 1분 안에 자동으로 알린다
export default function RestockForm({ slug, status }: { slug: string; status: RestockStatus }) {
  const [state, formAction, pending] = useActionState(saveRestockAction.bind(null, slug), { error: null, message: null } as RestockState);
  const on = status.sms || status.email;
  const channels = [status.sms && "문자", status.email && "메일"].filter(Boolean).join("·");
  return (
    <fieldset className="rounded-lg border p-4" data-restock-setting>
      <legend className="px-1 text-sm font-semibold">재입고 알림</legend>
      <p className="text-sm text-gray-600">
        품절 상품(옵션)에 손님이 <b>「재입고 알림 신청」</b>을 하면, 재고를 다시 채우거나 판매 중으로 바꾸는 순간 1분 안에 자동으로 알립니다.
        회원·비회원 모두 핸드폰으로 신청하고, 메일은 회원에게만 갑니다. 신청은 90일 뒤 만료되고, 끝난 신청의 번호는 30일 뒤 지웁니다.
        문자·메일은 아래 주문 알림과 같은 솔라피·Resend 설정으로 보냅니다(발송 비용은 몰 운영자 계정).
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="restock_sms" defaultChecked={status.sms} /> 문자로 알림
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="restock_email" defaultChecked={status.email} /> 메일로 알림(회원)
        </label>
        <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
          {pending ? "저장 중…" : "재입고 알림 저장"}
        </button>
      </form>
      <p className="mt-2 text-sm" data-restock-status>
        상태 <b>{on ? `켜짐(${channels})` : "꺼짐"}</b> · 대기 중인 신청 <b>{status.waiting}</b>건 ·{" "}
        <Link href={`/s/${slug}/admin/restock`} className="text-blue-700 underline">신청 목록 보기</Link>
      </p>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
    </fieldset>
  );
}
