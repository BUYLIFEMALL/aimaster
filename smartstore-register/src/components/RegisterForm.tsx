"use client";

import { useActionState, useState } from "react";
import { createJobAction } from "@/lib/actions/register";
import { REGISTER_MODES, type RegisterMode } from "@/lib/smartstore/fields";
import { OptionEditor } from "@/components/OptionEditor";

export function RegisterForm({ productId, defaultKeyword, initialOptions = null, initialCustomOptions = [], initialSupplements = "", initialPrice = null, initialSalePrice = null, defaultStock = 99, initialTags = [], initialMainInfo = { brand: "", manufacturer: "", model: "", used: false }, initialAttributes = "" }: { productId: string; defaultKeyword: string; initialOptions?: unknown; initialCustomOptions?: string[]; initialSupplements?: string; initialPrice?: number | null; initialSalePrice?: number | null; defaultStock?: number; initialTags?: string[]; initialMainInfo?: { brand: string; manufacturer: string; model: string; used: boolean }; initialAttributes?: string }) {
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
        <legend className="slw-label">판매가 <span className="font-normal text-slate-500">(상세페이지 가격이 기본, 스마트스토어만 다르게 받으려면 고치기)</span></legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="price" inputMode="numeric" defaultValue={initialPrice ?? ""} placeholder="정상가(원) *" className="slw-field" />
          <input name="salePrice" inputMode="numeric" defaultValue={initialSalePrice ?? ""} placeholder="할인가(원, 선택)" className="slw-field" />
        </div>
        <p className="text-[11px] text-slate-500">할인가를 넣으면 「정상가 − 할인가」가 즉시할인으로 들어갑니다. 여기서 바꾼 가격은 이번 등록에만 쓰고 상세페이지 상품 정보는 바꾸지 않습니다.</p>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="slw-label">상품 주요정보 <span className="font-normal text-slate-500">(선택)</span></legend>
        <input name="brand" defaultValue={initialMainInfo.brand} maxLength={50} placeholder="브랜드 (예: 스위스톤)" className="slw-field" />
        <input name="manufacturer" defaultValue={initialMainInfo.manufacturer} maxLength={50} placeholder="제조사" className="slw-field" />
        <select name="saleType" defaultValue={initialMainInfo.used ? "used" : "new"} className="slw-field">
          <option value="new">상품상태: 신상품</option>
          <option value="used">상품상태: 중고상품</option>
        </select>
        <p className="text-[11px] text-slate-500">비우면 판매자센터 칸을 건드리지 않습니다. 브랜드·제조사는 네이버 쇼핑 검색 품질에 쓰입니다. 모델명은 판매자센터 「찾기」(네이버 카탈로그)에서 직접 골라 주세요.</p>
      </fieldset>
      <div>
        <label className="slw-label" htmlFor="attributes">상품속성 <span className="font-normal text-slate-500">(선택, 한 줄에 「속성이름: 값」)</span></label>
        <textarea id="attributes" name="attributes" rows={3} defaultValue={initialAttributes} placeholder={"소재: 폴리에스터\n성별: 남녀공용"} className="slw-field" />
        <p className="mt-1 text-[11px] text-slate-500">카테고리마다 속성이 다릅니다. 판매자센터 「상품속성」 표의 이름 그대로 적어 주세요. 못 찾은 속성은 등록 기록에 「직접 확인할 칸」으로 남습니다.</p>
      </div>
      <OptionEditor initial={initialOptions} defaultStock={defaultStock} />
      <div>
        <label className="slw-label" htmlFor="customOptions">직접입력형 옵션 <span className="font-normal text-slate-500">(선택, 구매자가 글을 써넣는 옵션명, 쉼표로 최대 5개)</span></label>
        <input id="customOptions" name="customOptions" defaultValue={initialCustomOptions.join(", ")} placeholder="예: 각인 문구" className="slw-field" />
      </div>
      <div>
        <label className="slw-label" htmlFor="supplements">추가상품 <span className="font-normal text-slate-500">(선택, 한 줄에 「추가상품명 | 값1,값2 | 가격1,가격2」, 5줄까지)</span></label>
        <textarea id="supplements" name="supplements" rows={2} defaultValue={initialSupplements} placeholder={"파우치 | 블랙,그레이 | 3000,3000"} className="slw-field" />
      </div>
      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">예약구매 (선택)</summary>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="preOrderOn" /> 이 상품을 예약구매로 등록</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div><label className="slw-label" htmlFor="preOrderStart">주문 시작일</label><input id="preOrderStart" name="preOrderStart" type="date" className="slw-field" /></div>
          <div><label className="slw-label" htmlFor="preOrderEnd">주문 마감일</label><input id="preOrderEnd" name="preOrderEnd" type="date" className="slw-field" /></div>
          <div className="col-span-2"><label className="slw-label" htmlFor="preOrderAfter">기간 끝난 뒤 상품 상태</label>
            <select id="preOrderAfter" name="preOrderAfter" className="slw-field"><option value="CLOSE">판매종료</option><option value="SALE">판매 중</option></select></div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">달력 칸이라 자동 입력이 안 되면 등록 기록에 「직접 확인할 칸」으로 남습니다.</p>
      </details>
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
