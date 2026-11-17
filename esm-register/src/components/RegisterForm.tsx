"use client";

import { useActionState, useState } from "react";
import { createJobAction } from "@/lib/actions/register";
import { REGISTER_MODES, type RegisterMode } from "@/lib/esm/fields";
import { ExtensionPresence } from "@/components/ExtensionPresence";
import { COLLECTED_PHOTO_ACK_LABEL, COLLECTED_PHOTO_WARNING, COLLECTED_PHOTO_WARNING_TITLE } from "@/lib/collectedPhoto";

export function RegisterForm({ productId, defaultKeyword, initialPrice = null, initialSalePrice = null, initialOption = { name: "", values: "" }, initialBrand = "", collectedPhoto = false }: {
  productId: string;
  defaultKeyword: string;
  initialPrice?: number | null;
  initialSalePrice?: number | null;
  initialOption?: { name: string; values: string };
  initialBrand?: string;
  collectedPhoto?: boolean;
}) {
  const [state, action, pending] = useActionState(createJobAction, {});
  const [mode, setMode] = useState<RegisterMode>("fill_only");
  // React 19는 <form action>이 끝나면 비제어 칸을 기본값으로 되돌린다(성공·오류 모두).
  // 오류 뒤에도 회원이 넣은 값을 그대로 보고 고칠 수 있게 모든 칸을 제어 입력으로 둔다.
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [price, setPrice] = useState(initialPrice == null ? "" : String(initialPrice));
  const [salePrice, setSalePrice] = useState(initialSalePrice == null ? "" : String(initialSalePrice));
  const [brand, setBrand] = useState(initialBrand);
  const [optionName, setOptionName] = useState(initialOption.name);
  const [optionValues, setOptionValues] = useState(initialOption.values);
  const [confirmRegister, setConfirmRegister] = useState(false);
  const [repeatOk, setRepeatOk] = useState(false);
  const [collectedAck, setCollectedAck] = useState(false);
  const priceError = !!state?.error && state.error.startsWith("판매가·할인가");

  return (
    <form action={action} className="slw-card space-y-3 p-4">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label className="slw-label" htmlFor="categoryKeyword">카테고리 검색어 *</label>
        <input id="categoryKeyword" name="categoryKeyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 텀블러" className="slw-field" />
        <p className="mt-1 text-[11px] text-slate-500">확장이 ESM+ 「카테고리 검색」에 이 말을 넣고, 상세페이지 카테고리 경로와 가장 많이 겹치는 줄을 고릅니다. 고른 뒤 화면의 수수료(카테고리 기본이용료)를 기록합니다.</p>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="slw-label">판매가 <span className="font-normal text-slate-500">(상세페이지 가격이 기본)</span></legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={priceError || undefined} aria-label="정상가(원)" placeholder="정상가(원) *" className="slw-field" />
          <input name="salePrice" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} aria-invalid={priceError || undefined} aria-label="할인가(원)" placeholder="할인가(원, 선택)" className="slw-field" />
        </div>
        {priceError && <p role="alert" className="text-[11px] font-bold text-rose-700">위 가격 칸에 숫자만 넣어 주세요(쉼표·원은 빼고). 넣은 값은 그대로 두었습니다.</p>}
        <p className="text-[11px] text-slate-500">할인가가 있으면 할인가를 ESM+ 판매가로 넣습니다(10원 단위). 여기서 바꾼 가격은 이번 등록에만 씁니다.</p>
      </fieldset>
      <div>
        <label className="slw-label" htmlFor="brand">브랜드 <span className="font-normal text-slate-500">(선택, 비우면 「브랜드 없음」)</span></label>
        <input id="brand" name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={40} placeholder="예: 스위스톤" className="slw-field" />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="slw-label">옵션 <span className="font-normal text-slate-500">(선택, 단독형 1개 · 추가금 0원)</span></legend>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <input name="optionName" value={optionName} onChange={(e) => setOptionName(e.target.value)} maxLength={25} placeholder="옵션명(예: 색상)" className="slw-field" />
          <input name="optionValues" value={optionValues} onChange={(e) => setOptionValues(e.target.value)} placeholder="값을 쉼표로(예: 블랙, 화이트)" className="slw-field" />
        </div>
        <p className="text-[11px] text-slate-500">비우면 옵션 「설정안함」. 옵션마다 다른 가격·조합형은 ESM+ 화면에서 직접 넣어 주세요(「입력만」 권장).</p>
      </fieldset>
      <fieldset>
        <legend className="slw-label">등록 방식</legend>
        <div className="space-y-2">
          {(Object.keys(REGISTER_MODES) as RegisterMode[]).map((m) => (
            <label key={m} className={`flex cursor-pointer gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${mode === m ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-[#E5E8EB] bg-white hover:bg-slate-50"}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-0.5" />
              <span>
                <b className="text-sm text-[#111827]">{REGISTER_MODES[m].label}</b>
                <span className="mt-0.5 block text-[11px] text-[#6B7280]">{REGISTER_MODES[m].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "register" && (
        <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-[#4B5563]">
          <label className="flex items-start gap-2 font-bold text-amber-900">
            <input type="checkbox" name="confirmRegister" required checked={confirmRegister} onChange={(e) => setConfirmRegister(e.target.checked)} className="mt-0.5" />
            <span>G마켓·옥션에 <b>실제 상품이 생기는 것</b>을 확인했습니다.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="repeatOk" checked={repeatOk} onChange={(e) => setRepeatOk(e.target.checked)} className="mt-0.5" />
            <span>이미 등록한 상품이면 <b>한 번 더 등록합니다</b>(같은 상품이 하나 더 생깁니다).</span>
          </label>
        </div>
      )}
      {collectedPhoto && (
        <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
          <p className="text-xs font-extrabold">{COLLECTED_PHOTO_WARNING_TITLE}</p>
          <p className="text-[11px] leading-relaxed">{COLLECTED_PHOTO_WARNING}</p>
          <label className="flex items-start gap-1.5 text-[11px] font-bold">
            <input type="checkbox" name="collectedAck" required checked={collectedAck} onChange={(e) => setCollectedAck(e.target.checked)} className="mt-0.5" />
            <span>{COLLECTED_PHOTO_ACK_LABEL}</span>
          </label>
        </div>
      )}
      <ExtensionPresence />
      <button type="submit" disabled={pending} className="btn-3d-primary w-full !py-3 text-sm font-black">{pending ? "작업 만드는 중…" : "🛒 확장으로 G마켓·옥션 보내기"}</button>
      {state?.ok && <p role="status" className="text-xs font-black text-emerald-700">✅ 작업을 만들었습니다. ESM+에 로그인된 크롬에서 확장이 순서대로 채웁니다.</p>}
      {state?.error && <p role="alert" className="text-xs font-bold text-rose-700">{state.error}</p>}
      <p className="text-[11px] text-slate-500">처음에는 「입력만」으로 확인해 보세요. 결과가 확실하지 않으면 확장이 자동으로 다시 등록하지 않습니다.</p>
    </form>
  );
}
