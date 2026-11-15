"use client";

import { useActionState, useState } from "react";
import { saveDefaultsAction } from "@/lib/actions/register";
import { SHIP_POLICIES, type StoreDefaults } from "@/lib/esm/fields";

// ESM+ 「배송정보관리」에 미리 만든 값의 「보이는 이름」을 적는다 — 확장은 그 글자로 고르기만 한다(새로 만들지 않음).
export function DefaultsForm({ initial }: { initial: StoreDefaults }) {
  const [state, action, pending] = useActionState(saveDefaultsAction, {});
  const [tpl, setTpl] = useState(initial.deliveryTemplate);

  return (
    <form action={action} className="slw-card grid gap-5 p-6 sm:grid-cols-2">
      <div>
        <label className="slw-label" htmlFor="sites">판매사이트</label>
        <select key={initial.sites} id="sites" name="sites" defaultValue={initial.sites} className="slw-field">
          <option value="both">G마켓 + 옥션 (함께 등록)</option>
          <option value="gmarket">G마켓만</option>
          <option value="auction">옥션만</option>
        </select>
      </div>
      <div>
        <label className="slw-label" htmlFor="stock">재고수량(기본, 사이트마다 같은 값)</label>
        <input id="stock" name="stock" type="number" min={1} max={99999} defaultValue={initial.stock} className="slw-field" />
      </div>
      <div>
        <label className="slw-label" htmlFor="vat">부가세</label>
        <select key={initial.vat} id="vat" name="vat" defaultValue={initial.vat} className="slw-field">
          <option value="과세상품">과세상품</option>
          <option value="면세상품">면세상품</option>
        </select>
      </div>
      <div>
        <label className="slw-label" htmlFor="saleDays">판매기간</label>
        <select key={initial.saleDays} id="saleDays" name="saleDays" defaultValue={initial.saleDays} className="slw-field">
          <option value="">ESM+ 기본값 그대로</option>
          {["15", "30", "60", "90", "120"].map((d) => <option key={d} value={d}>{d}일</option>)}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="slw-label" htmlFor="noticeGroup">상품정보 제공고시 상품군</label>
        <input id="noticeGroup" name="noticeGroup" defaultValue={initial.noticeGroup} placeholder="ESM+ 목록 글자 그대로(예: 주방용품, 기타 재화)" className="slw-field" />
        <label className="mt-1.5 flex items-center gap-1.5 text-xs text-[#4B5563]">
          <input type="checkbox" name="noticeReference" defaultChecked={initial.noticeReference} />
          <span>「'상품 상세설명 참조'로 전체 입력」 누르기</span>
        </label>
      </div>

      <fieldset className="sm:col-span-2 grid gap-2 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 text-sm">
        <legend className="px-1 text-xs font-black text-[#111827]">인증·허가 (법적 선택 — 직접 정해 주세요)</legend>
        <label className="flex items-center gap-2"><input type="checkbox" name="certNotTarget" defaultChecked={initial.certNotTarget} /> 인증정보 「인증대상이 아님」</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="licenseNotTarget" defaultChecked={initial.licenseNotTarget} /> 영업허가증 칸이 나오면 「허가 대상이 아님」</label>
        <p className="text-[11px] text-[#9CA3AF]">KC 인증·영업허가가 필요한 상품은 체크를 끄고 ESM+ 화면에서 직접 넣어 주세요(「입력만」 권장).</p>
      </fieldset>

      <div className="sm:col-span-2">
        <label className="slw-label" htmlFor="deliveryTemplate">배송정보 템플릿 이름 (선택)</label>
        <input id="deliveryTemplate" name="deliveryTemplate" defaultValue={initial.deliveryTemplate} onChange={(e) => setTpl(e.target.value)} placeholder="ESM+에 저장한 배송정보 템플릿 이름 그대로" className="slw-field" />
        <p className="mt-1 text-[11px] text-[#9CA3AF]">비우면 아래 칸을 확장이 하나씩 고릅니다.</p>
      </div>

      <fieldset disabled={Boolean(tpl.trim())} className="grid gap-3.5 sm:col-span-2 sm:grid-cols-2 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 disabled:opacity-50">
        <legend className="px-1 text-xs font-black text-[#111827] sm:col-span-2">
          배송 칸 하나씩 <span className="font-normal text-[#6B7280]">(템플릿 이름이 비어 있을 때만 씀 · ESM+ 「배송정보관리」에 있는 값만)</span>
        </legend>
        <div>
          <label className="slw-label" htmlFor="deliveryCompany">택배사</label>
          <input id="deliveryCompany" name="deliveryCompany" list="esm-couriers" defaultValue={initial.deliveryCompany} placeholder="예: CJ택배" className="slw-field" />
          <datalist id="esm-couriers">
            {["CJ택배", "대한통운", "한진택배", "우체국택배", "롯데택배", "로젠택배", "경동택배"].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="slw-label" htmlFor="shipPolicy">발송정책</label>
          <select key={initial.shipPolicy} id="shipPolicy" name="shipPolicy" defaultValue={initial.shipPolicy} className="slw-field">
            <option value="">ESM+ 기본값 그대로</option>
            {SHIP_POLICIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="slw-label" htmlFor="shipOrigin">출고지 이름</label>
          <input id="shipOrigin" name="shipOrigin" defaultValue={initial.shipOrigin} placeholder="판매자 주소록 이름(예: 바이라이프)" className="slw-field" />
        </div>
        <div>
          <label className="slw-label" htmlFor="bundle">묶음배송</label>
          <select key={initial.bundle} id="bundle" name="bundle" defaultValue={initial.bundle} className="slw-field">
            <option value="">ESM+ 기본값 그대로</option>
            <option value="설정함">설정함</option>
            <option value="설정안함(개별배송)">설정안함(개별배송)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="slw-label" htmlFor="feePolicyNo">배송비 정책 번호</label>
          <input id="feePolicyNo" name="feePolicyNo" inputMode="numeric" defaultValue={initial.feePolicyNo} placeholder="ESM+ 배송비 선택 목록의 괄호 안 숫자(예: 37246700)" className="slw-field" />
          <p className="mt-1 text-[11px] text-[#9CA3AF]">배송비는 ESM+ 「배송정보관리」 메뉴에서만 새로 만들 수 있습니다. 먼저 그곳에서 만들고 번호를 적어 주세요.</p>
        </div>
      </fieldset>

      <fieldset className="grid gap-3.5 sm:col-span-2 sm:grid-cols-2 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-4">
        <legend className="px-1 text-xs font-black text-[#111827] sm:col-span-2">반품/교환</legend>
        <div>
          <label className="slw-label" htmlFor="returnPlace">반품 교환지 이름</label>
          <input id="returnPlace" name="returnPlace" defaultValue={initial.returnPlace} placeholder="비우면 ESM+ 기본 주소" className="slw-field" />
        </div>
        <div>
          <label className="slw-label" htmlFor="returnFee">반품/교환 배송비(편도, 원)</label>
          <input id="returnFee" name="returnFee" type="number" min={0} step={10} defaultValue={initial.returnFee ?? ""} placeholder="비우면 ESM+ 기본값 · 0이면 무료" className="slw-field" />
        </div>
      </fieldset>

      <div>
        <label className="slw-label" htmlFor="origin">원산지</label>
        <select key={initial.origin} id="origin" name="origin" defaultValue={initial.origin} className="slw-field">
          <option value="detail">상품 상세설명 참조</option>
          <option value="none">원산지 의무표시 대상 아님</option>
        </select>
      </div>
      <div>
        <label className="slw-label" htmlFor="affiliate">외부제휴채널 상품등록</label>
        <select key={initial.affiliate} id="affiliate" name="affiliate" defaultValue={initial.affiliate} className="slw-field">
          <option value="">ESM+ 기본값 그대로</option>
          <option value="등록함">등록함 (그 채널 주문에 2% 이용료)</option>
          <option value="등록안함">등록안함</option>
        </select>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2 pt-2">
        <button type="submit" disabled={pending} className="btn-3d-primary !py-3 !px-6 text-sm font-black">
          {pending ? "기본값 저장 중…" : "💾 기본값 저장"}
        </button>
        {state?.ok && <span role="status" className="text-xs font-black text-emerald-700">✅ 기본값을 저장했습니다.</span>}
        {state?.error && <span role="alert" className="text-xs font-black text-rose-700">{state.error}</span>}
      </div>
    </form>
  );
}
