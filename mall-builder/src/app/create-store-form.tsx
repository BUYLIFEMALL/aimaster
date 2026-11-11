"use client";

import { useActionState } from "react";
import { createStoreAction, type CreateStoreState } from "./actions";

const initial: CreateStoreState = { error: null, slug: "", name: "" };

/** D31 새 몰 만들기 — sources가 있으면 기존 몰 설정 복사 칸을 보인다 */
export default function CreateStoreForm({ sources = [], label = "내 쇼핑몰 만들기" }: { sources?: { id: string; name: string }[]; label?: string }) {
  const [state, formAction, pending] = useActionState(createStoreAction, initial);

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-lg border p-4">
      <label className="block">
        <span className="text-sm font-medium">몰 이름</span>
        <input
          name="name"
          defaultValue={state.name}
          maxLength={40}
          required
          placeholder="예: 바이라이프 도매몰"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">몰 주소</span>
        <div className="mt-1 flex items-center rounded border">
          <span className="whitespace-nowrap border-r bg-gray-50 px-3 py-2 text-sm text-gray-500">/s/</span>
          <input
            name="slug"
            defaultValue={state.slug}
            maxLength={30}
            required
            placeholder="buylife-b2b"
            className="w-full px-3 py-2 outline-none"
          />
        </div>
        <span className="mt-1 block text-xs text-gray-500">영문 소문자·숫자·하이픈 3~30자. 만든 뒤에는 바꿀 수 없습니다.</span>
      </label>
      {sources.length > 0 && (
        <fieldset className="rounded border p-3 text-sm" data-copy-setup>
          <legend className="px-1 text-xs text-gray-500">기존 몰 설정으로 시작(선택)</legend>
          <select name="copy_from" defaultValue="" className="w-full rounded border px-2 py-2">
            <option value="">복사 안 함 — 빈 몰로 시작</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}에서 복사</option>)}
          </select>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {[["categories", "카테고리"], ["shipping", "배송비 정책"], ["grades", "회원 등급"], ["business", "사업자 정보·몰 설정"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-1"><input type="checkbox" name={`copy_${k}`} defaultChecked /> {l}</label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">상품·손님·주문은 복사하지 않습니다. 문자·결제·AI·세금계산서 키는 새 몰에서 다시 등록합니다.</p>
        </fieldset>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50">
        {pending ? "만드는 중…" : label}
      </button>
    </form>
  );
}
