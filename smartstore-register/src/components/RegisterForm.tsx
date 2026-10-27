"use client";

import { useActionState, useState } from "react";
import { createJobAction } from "@/lib/actions/register";
import { REGISTER_MODES, type RegisterMode } from "@/lib/smartstore/fields";
import { OptionEditor } from "@/components/OptionEditor";

export function RegisterForm({ productId, defaultKeyword, initialOptions = null, defaultStock = 99, initialTags = [], initialMainInfo = { brand: "", manufacturer: "", model: "", used: false } }: { productId: string; defaultKeyword: string; initialOptions?: unknown; defaultStock?: number; initialTags?: string[]; initialMainInfo?: { brand: string; manufacturer: string; model: string; used: boolean } }) {
  const [state, action, pending] = useActionState(createJobAction, {});
  const [mode, setMode] = useState<RegisterMode>("fill_only");

  return (
    <form action={action} className="slw-card space-y-3 p-4">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label className="slw-label" htmlFor="categoryKeyword">카테고리 검색어 *</label>
        <input id="categoryKeyword" name="categoryKeyword" defaultValue={defaultKeyword} placeholder="예: 텀블러" className="slw-field" />
        <p className="mt-1 text-[11px] text-slate-500">확장이 이 말로 검색해 마지막 단계 카테고리까지 고릅니다.</p>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="slw-label">상품 주요정보 <span className="font-normal text-slate-500">(선택)</span></legend>
        <input name="brand" defaultValue={initialMainInfo.brand} maxLength={50} placeholder="브랜드 (예: 스위스톤)" className="slw-field" />
        <input name="manufacturer" defaultValue={initialMainInfo.manufacturer} maxLength={50} placeholder="제조사" className="slw-field" />
        <input name="modelName" defaultValue={initialMainInfo.model} maxLength={50} placeholder="모델명 (예: ST4D18)" className="slw-field" />
        <select name="saleType" defaultValue={initialMainInfo.used ? "used" : "new"} className="slw-field">
          <option value="new">상품상태: 신상품</option>
          <option value="used">상품상태: 중고상품</option>
        </select>
        <p className="text-[11px] text-slate-500">비우면 판매자센터 칸을 건드리지 않습니다. 브랜드·제조사는 네이버 쇼핑 검색 품질에 쓰입니다.</p>
      </fieldset>
      <OptionEditor initial={initialOptions} defaultStock={defaultStock} />
      <div>
        <label className="slw-label" htmlFor="tags">검색 태그 <span className="font-normal text-slate-500">(선택, 쉼표로 구분, 최대 10개)</span></label>
        <input id="tags" name="tags" defaultValue={initialTags.join(", ")} placeholder="예: 여행백팩, 노트북가방, 출장가방" className="slw-field" />
        <p className="mt-1 text-[11px] text-slate-500">카테고리·브랜드·판매처 이름이 들어간 태그는 스마트스토어가 등록하지 않습니다. 상품과 관계없는 태그는 판매금지될 수 있습니다.</p>
      </div>
      <fieldset>
        <legend className="slw-label">등록 방식</legend>
        <div className="space-y-1.5">
          {(Object.keys(REGISTER_MODES) as RegisterMode[]).map((m) => (
            <label key={m} className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-xs ${mode === m ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-0.5" />
              <span>
                <b className="text-slate-900">{REGISTER_MODES[m].label}</b>
                <span className="block text-slate-600">{REGISTER_MODES[m].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "register" && (
        <label className="flex items-start gap-1.5 text-[11px] text-slate-600">
          <input type="checkbox" name="repeatOk" className="mt-0.5" />
          <span>이미 등록한 상품이면 <b>한 번 더 등록합니다</b>(같은 상품이 판매자센터에 하나 더 생깁니다). 처음 올리는 상품이면 체크하지 않아도 됩니다.</span>
        </label>
      )}
      <button type="submit" disabled={pending} className="slw-primary w-full">{pending ? "작업 만드는 중…" : "🧩 확장으로 보내기"}</button>
      {state?.ok && <p role="status" className="text-xs font-bold text-emerald-700">✅ 작업을 만들었습니다. 스마트스토어센터에 로그인된 크롬에서 확장이 순서대로 채웁니다.</p>}
      {state?.error && <p role="alert" className="text-xs font-bold text-rose-700">{state.error}</p>}
      <p className="text-[11px] text-slate-500">처음에는 「입력만」이나 「임시저장까지」로 확인해 보세요. 결과가 확실하지 않으면 확장이 자동으로 다시 등록하지 않습니다.</p>
    </form>
  );
}
