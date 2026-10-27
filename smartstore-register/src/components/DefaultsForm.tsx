"use client";

import { useActionState, useState } from "react";
import { saveDefaultsAction } from "@/lib/actions/register";
import type { StoreDefaults } from "@/lib/smartstore/fields";

export function DefaultsForm({ initial }: { initial: StoreDefaults }) {
  const [state, action, pending] = useActionState(saveDefaultsAction, {});
  const [origin, setOrigin] = useState(initial.originType);
  const [fee, setFee] = useState(initial.deliveryFeeType);
  const [jeju, setJeju] = useState(initial.jejuMode);

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
        <p className="mt-1 text-[11px] text-slate-500">비우면 아래 배송비를 확장이 직접 넣습니다. 템플릿이 없으면 비워 두세요.</p>
      </div>
      <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-4">
        <legend className="slw-label sm:col-span-4">배송비 직접 입력 <span className="font-normal text-slate-500">(템플릿 이름이 비어 있을 때만 씀)</span></legend>
        <div>
          <label className="slw-label" htmlFor="deliveryCompany">택배사</label>
          <input id="deliveryCompany" name="deliveryCompany" list="ssr-couriers" defaultValue={initial.deliveryCompany} placeholder="예: CJ대한통운" className="slw-field" />
          <datalist id="ssr-couriers">
            {["CJ대한통운", "롯데택배", "한진택배", "로젠택배", "우체국택배", "경동택배", "대신택배", "일양로지스", "합동택배", "CU 편의점택배", "GS Postbox 택배"].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="slw-label" htmlFor="deliveryFeeType">배송비</label>
          {/* key: 저장 뒤 폼이 초기화될 때 고르기 상자가 옛 값으로 보이지 않게 새 값으로 다시 그림 */}
          <select key={initial.deliveryFeeType} id="deliveryFeeType" name="deliveryFeeType" defaultValue={initial.deliveryFeeType} onChange={(e) => setFee(e.target.value as typeof fee)} className="slw-field">
            <option value="">판매자센터 기본값 그대로</option>
            <option value="FREE">무료</option>
            <option value="PAID">유료</option>
            <option value="CONDITIONAL_FREE">조건부 무료</option>
            <option value="QUANTITY">수량별</option>
            <option value="RANGE">구간별(2구간)</option>
          </select>
        </div>
        <div>
          <label className="slw-label" htmlFor="baseFee">기본 배송비(원)</label>
          <input id="baseFee" name="baseFee" type="number" min={0} step={10} defaultValue={initial.baseFee ?? ""} placeholder="예: 3000" className="slw-field" />
        </div>
        {fee === "CONDITIONAL_FREE" || fee === "" ? (
          <div>
            <label className="slw-label" htmlFor="freeOver">○원 이상 무료</label>
            <input id="freeOver" name="freeOver" type="number" min={10} step={10} defaultValue={initial.freeOver ?? ""} placeholder="조건부 무료일 때" className="slw-field" />
          </div>
        ) : <input type="hidden" name="freeOver" value={initial.freeOver ?? ""} />}
        {fee === "QUANTITY" && (
          <div>
            <label className="slw-label" htmlFor="qtyEvery">○개마다 반복 부과</label>
            <input id="qtyEvery" name="qtyEvery" type="number" min={1} defaultValue={initial.qtyEvery ?? ""} placeholder="예: 3" className="slw-field" />
          </div>
        )}
        {fee === "RANGE" && (
          <>
            <div>
              <label className="slw-label" htmlFor="rangeUpTo">○개까지 추가배송비 없음</label>
              <input id="rangeUpTo" name="rangeUpTo" type="number" min={1} defaultValue={initial.rangeUpTo ?? ""} placeholder="예: 5" className="slw-field" />
            </div>
            <div>
              <label className="slw-label" htmlFor="rangeExtraFee">초과 구매 시 추가배송비(원)</label>
              <input id="rangeExtraFee" name="rangeExtraFee" type="number" min={0} step={10} defaultValue={initial.rangeExtraFee ?? ""} placeholder="예: 3000" className="slw-field" />
            </div>
          </>
        )}
        {fee !== "QUANTITY" && <input type="hidden" name="qtyEvery" value={initial.qtyEvery ?? ""} />}
        {fee !== "RANGE" && <><input type="hidden" name="rangeUpTo" value={initial.rangeUpTo ?? ""} /><input type="hidden" name="rangeExtraFee" value={initial.rangeExtraFee ?? ""} /></>}
        <div>
          <label className="slw-label" htmlFor="payType">결제방식</label>
          <select id="payType" name="payType" defaultValue={initial.payType} className="slw-field">
            <option value="">판매자센터 기본값 그대로</option>
            <option value="선결제">선결제</option>
            <option value="착불">착불</option>
            <option value="착불 또는 선결제">착불 또는 선결제</option>
          </select>
        </div>
        <div>
          <label className="slw-label" htmlFor="bundle">묶음배송</label>
          <select id="bundle" name="bundle" defaultValue={initial.bundle} className="slw-field">
            <option value="">판매자센터 기본값 그대로</option>
            <option value="가능">가능</option>
            <option value="불가">불가(개별계산)</option>
          </select>
        </div>
        <div>
          <label className="slw-label" htmlFor="installFee">별도 설치비</label>
          <select id="installFee" name="installFee" defaultValue={initial.installFee} className="slw-field">
            <option value="">판매자센터 기본값 그대로</option>
            <option value="없음">없음</option>
            <option value="있음">있음</option>
          </select>
        </div>
        <div>
          <label className="slw-label" htmlFor="jejuMode">제주/도서산간 추가배송비</label>
          <select id="jejuMode" name="jejuMode" defaultValue={initial.jejuMode} onChange={(e) => setJeju(e.target.value as typeof jeju)} className="slw-field">
            <option value="">판매자센터 기본값 그대로</option>
            <option value="off">설정안함</option>
            <option value="2">설정함 · 2권역</option>
            <option value="3">설정함 · 3권역</option>
          </select>
        </div>
        {(jeju === "2" || jeju === "3") ? (
          <div>
            <label className="slw-label" htmlFor="jejuFee">{jeju === "2" ? "제주 및 도서산간 추가배송비(원)" : "제주 추가배송비(원)"}</label>
            <input id="jejuFee" name="jejuFee" type="number" min={0} step={10} defaultValue={initial.jejuFee ?? ""} placeholder="예: 5000" className="slw-field" />
          </div>
        ) : <input type="hidden" name="jejuFee" value={initial.jejuFee ?? ""} />}
        {jeju === "3" ? (
          <div>
            <label className="slw-label" htmlFor="islandFee">제주 외 도서산간 추가배송비(원)</label>
            <input id="islandFee" name="islandFee" type="number" min={0} step={10} defaultValue={initial.islandFee ?? ""} placeholder="예: 7000" className="slw-field" />
          </div>
        ) : <input type="hidden" name="islandFee" value={initial.islandFee ?? ""} />}
        <div className="sm:col-span-2">
          <label className="slw-label" htmlFor="regionFee">지역별 차등 배송비</label>
          <input id="regionFee" name="regionFee" defaultValue={initial.regionFee} placeholder="제주/도서산간 외 지역 차등이 있을 때만(예: 산간지역 3000원)" className="slw-field" />
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="slw-label" htmlFor="returnCompany">반품 택배사</label>
          <input id="returnCompany" name="returnCompany" list="ssr-couriers" defaultValue={initial.returnCompany} placeholder="비우면 판매자센터 기본값(반품/교환지는 판매자 주소록 기본 주소)" className="slw-field" />
        </div>
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

      <div className="sm:col-span-2">
        <label className="slw-label" htmlFor="childCert">어린이제품인증</label>
        <select id="childCert" name="childCert" defaultValue={initial.childCert} className="slw-field">
          <option value="">판매자센터 기본값 그대로</option>
          <option value="not_target">인증대상 아님(성인용 상품)</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-500">가방·의류 등 일부 카테고리에서만 나오는 칸입니다. 어린이(13세 이하)용이 아닌 상품만 「인증대상 아님」을 고르세요 — 판매자 책임 항목입니다.</p>
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
