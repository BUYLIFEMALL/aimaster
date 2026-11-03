"use client";

import { useActionState } from "react";
import { createStoreAction, type CreateStoreState } from "./actions";

const initial: CreateStoreState = { error: null, slug: "", name: "" };

export default function CreateStoreForm() {
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
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50">
        {pending ? "만드는 중…" : "내 쇼핑몰 만들기"}
      </button>
    </form>
  );
}
