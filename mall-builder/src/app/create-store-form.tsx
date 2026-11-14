"use client";

import { useActionState } from "react";
import { createStoreAction, type CreateStoreState } from "./actions";

const initial: CreateStoreState = { error: null, slug: "", name: "" };

/** D31 새 몰 만들기 — sources가 있으면 기존 몰 설정 복사 칸을 보인다 */
export default function CreateStoreForm({ sources = [], label = "내 쇼핑몰 만들기" }: { sources?: { id: string; name: string }[]; label?: string }) {
  const [state, formAction, pending] = useActionState(createStoreAction, initial);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-sm">🏪</span>
        <h3 className="text-sm font-bold text-slate-900">새 B2B 쇼핑몰 개설</h3>
      </div>
      <label className="block">
        <span className="text-xs font-bold text-slate-700">몰 이름</span>
        <input
          name="name"
          defaultValue={state.name}
          maxLength={40}
          required
          placeholder="예: 바이라이프 B2B 스토어"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-700">몰 고유 주소 (URL)</span>
        <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <span className="select-none border-r border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-600">
            /s/
          </span>
          <input
            name="slug"
            defaultValue={state.slug}
            maxLength={30}
            required
            placeholder="buylife-b2b"
            className="w-full bg-transparent px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-hidden"
          />
        </div>
        <span className="mt-1.5 block text-[11px] text-slate-500">영문 소문자·숫자·하이픈 3~30자 (개설 후 변경 불가)</span>
      </label>
      {sources.length > 0 && (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs" data-copy-setup>
          <legend className="px-1 text-[11px] font-bold text-slate-600">기존 몰 설정 복사 (선택)</legend>
          <select name="copy_from" defaultValue="" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800">
            <option value="">복사 안 함 — 빈 몰로 시작</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}에서 복사</option>)}
          </select>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[["categories", "카테고리 분류"], ["shipping", "배송비 정책"], ["grades", "회원/사업자 등급"], ["business", "사업자 정보·몰 기본설정"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                <input type="checkbox" name={`copy_${k}`} defaultChecked className="rounded border-slate-300 text-blue-600" />
                <span>{l}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">※ 상품·손님·주문은 복사되지 않으며, 안전한 개설을 위해 결제·API 키는 새 몰에서 개별 등록합니다.</p>
        </fieldset>
      )}
      {state.error && <p className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">{state.error}</p>}
      <button disabled={pending} className="min-h-12 w-full btn-3d-blue text-sm font-bold disabled:opacity-50">
        {pending ? "개설 처리 중…" : label}
      </button>
    </form>
  );
}
