"use client";

import { useActionState } from "react";
import { joinAction, type JoinState } from "../my/actions";

export default function JoinForm({ slug, next, storeName }: { slug: string; next: string; storeName: string }) {
  const initial: JoinState = { error: null, name: "", phone: "", marketing_agree: false };
  const [state, formAction, pending] = useActionState(joinAction.bind(null, slug, next), initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">이름</span>
        <input name="name" defaultValue={state.name} required maxLength={30} className="mt-1 w-full rounded border px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">휴대폰</span>
        <input name="phone" defaultValue={state.phone} required inputMode="tel" placeholder="010-1234-5678" className="mt-1 w-full rounded border px-3 py-2" />
      </label>
      <div className="space-y-2 rounded border bg-gray-50 p-3 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="agree_terms" className="mt-1" />
          <span>(필수) {storeName}의 이용약관과 개인정보 수집·이용(이름·휴대폰·배송지, 주문 처리 목적)에 동의합니다.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="marketing_agree" defaultChecked={state.marketing_agree} className="mt-1" />
          <span>(선택) 할인·신상품 소식을 받겠습니다.</span>
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50">
        {pending ? "가입하는 중…" : "가입하기"}
      </button>
    </form>
  );
}
