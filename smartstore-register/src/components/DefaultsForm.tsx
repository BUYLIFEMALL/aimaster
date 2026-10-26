"use client";

import { useActionState, useState } from "react";
import { saveDefaultsAction } from "@/lib/actions/register";
import type { StoreDefaults } from "@/lib/smartstore/fields";

export function DefaultsForm({ initial }: { initial: StoreDefaults }) {
  const [state, action, pending] = useActionState(saveDefaultsAction, {});
  const [origin, setOrigin] = useState(initial.originType);

  return (
    <form action={action} className="slw-card grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className="slw-label" htmlFor="stock">재고수량(기본)</label>
        <input id="stock" name="stock" type="number" min={0} defaultValue={initial.stock} className="slw-field" />
      </div>
      <div>
        <label className="slw-label" htmlFor="noticeGroup">상품정보제공고시 상품군</label>
        <input id="noticeGroup" name="noticeGroup" defaultValue={initial.noticeGroup} placeholder="예: 주방용품, 기타 재화" className="slw-field" />
        <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" name="noticeReference" defaultChecked={initial.noticeReference} /> 「상품상세 참조로 전체 입력」 켜기
        </label>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="slw-label">원산지</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {([["domestic", "국산"], ["import", "수입산"], ["etc", "기타(직접 입력)"]] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input type="radio" name="originType" value={v} checked={origin === v} onChange={() => setOrigin(v)} /> {l}
            </label>
          ))}
        </div>
        {origin !== "domestic" && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <input name="originCountry" defaultValue={initial.originCountry} placeholder={origin === "import" ? "나라(예: 중국)" : "원산지 내용"} className="slw-field" />
            {origin === "import" && <input name="importer" defaultValue={initial.importer} placeholder="수입사(선택)" className="slw-field" />}
          </div>
        )}
      </fieldset>

      <div>
        <label className="slw-label" htmlFor="deliveryTemplate">배송 템플릿 이름</label>
        <input id="deliveryTemplate" name="deliveryTemplate" defaultValue={initial.deliveryTemplate} placeholder="판매자센터에 저장한 이름 그대로" className="slw-field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="slw-label" htmlFor="returnFee">반품 배송비(편도)</label>
          <input id="returnFee" name="returnFee" type="number" min={0} defaultValue={initial.returnFee ?? ""} placeholder="템플릿 쓰면 비움" className="slw-field" />
        </div>
        <div>
          <label className="slw-label" htmlFor="exchangeFee">교환 배송비(왕복)</label>
          <input id="exchangeFee" name="exchangeFee" type="number" min={0} defaultValue={initial.exchangeFee ?? ""} placeholder="템플릿 쓰면 비움" className="slw-field" />
        </div>
      </div>

      <div>
        <label className="slw-label" htmlFor="asPhone">A/S 전화번호 *</label>
        <input id="asPhone" name="asPhone" defaultValue={initial.asPhone} placeholder="010-1234-5678" className="slw-field" />
      </div>
      <div>
        <label className="slw-label" htmlFor="asGuide">A/S 안내</label>
        <input id="asGuide" name="asGuide" defaultValue={initial.asGuide} placeholder="비우면 「상품 상세페이지 참조」" className="slw-field" />
      </div>

      <label className="flex items-center gap-1.5 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" name="displayOnRegister" defaultChecked={initial.displayOnRegister} />
        「바로 등록」 때 바로 전시하기 <span className="text-xs text-slate-500">(끄면 전시중지 = 판매대기로 올라감, 기본 꺼짐)</span>
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="slw-primary">{pending ? "저장 중…" : "💾 기본값 저장"}</button>
        {state?.ok && <span role="status" className="text-xs font-bold text-emerald-700">✅ 저장했습니다.</span>}
        {state?.error && <span role="alert" className="text-xs font-bold text-rose-700">{state.error}</span>}
      </div>
    </form>
  );
}
