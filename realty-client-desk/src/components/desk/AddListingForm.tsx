"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { addCandidateListingAction, addListingAction, type ListingState } from "@/lib/actions/listings";
import { DEAL_TYPES, PROPERTY_TYPES } from "@/lib/desk/consent";
import { asInput, type PrefillDefaults } from "@/lib/desk/prefill";

const field = "mb-1 block text-xs font-semibold text-mx-muted";

// 2단계(2026-11-03): 내 매물 등록. 소재지에 동 이름이 들어가야 고객 「원하는 지역」과 맞춰 본다.
// 공인중개사법 광고 명시 항목(면적·층·방향·방/욕실·입주·주차·사용승인·관리비) 칸을 미리 둔다(점검은 4단계).
// C-1(2026-11-20): candidate가 있으면 「매물 알림에서 온 미저장 후보」 모드 — 값은 화면 메모리의 기본값뿐(저장 전 DB 0),
// 의뢰 확인란을 체크해야 저장 버튼이 켜지고, 저장은 후보 전용 서버 액션(서버가 확인값 강제·상태 「후보」).
// 응답이 분명하지 않으면 자동으로 다시 보내지 않고 목록 확인을 안내한다(후보 값은 폼에 남김).
const UNKNOWN = "저장됐는지 확인하지 못했어요. 아래 매물 목록에서 먼저 확인한 뒤 필요하면 다시 등록해 주세요.";

export function AddListingForm({ candidate = null, onSaved }: { candidate?: PrefillDefaults | null; onSaved?: () => void } = {}) {
  const isCandidate = candidate !== null;
  const [state, action, pending] = useActionState<ListingState, FormData>(async (prev, fd) => {
    try {
      return await (isCandidate ? addCandidateListingAction : addListingAction)(prev, fd);
    } catch {
      return { error: UNKNOWN };
    }
  }, {});
  const [mandate, setMandate] = useState(false);
  useEffect(() => {
    if (state.success && isCandidate) onSaved?.(); // 등록 성공 때 후보 값을 버린다
  }, [state.success, isCandidate, onSaved]);
  useEffect(() => setMandate(false), [candidate]); // 새 후보마다 확인란은 다시 비움(기억하지 않음)
  const c = candidate;
  return (
    <details className="mx-card p-5" open={Boolean(state.error) || isCandidate}>
      <summary className="cursor-pointer text-base font-bold text-mx-text">{isCandidate ? "🏠 매물 알림에서 온 후보 등록" : "➕ 매물 등록"}</summary>
      {/* 2026-11-20: <form action>은 저장 결과와 상관없이 React가 폼을 자동 초기화해(React 19.2.4 startHostTransition → requestFormReset)
          저장 실패·응답 불명 때 회원이 고친 값이 사라졌다(PLAN E9). 제출을 직접 처리해 실패 때 입력을 그대로 남긴다 — 성공 때는 key가 바뀌어 새 폼. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        key={`${state.success ?? "form"}-${isCandidate ? "c" : "n"}`}
        className="mt-4 space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={field}>매물 이름 *</span>
            <input name="title" required maxLength={60} defaultValue={c?.title} placeholder="예: 백석동 동문굿모닝힐 84㎡ 남향" className="mx-input" /></label>
          <label><span className={field}>거래 *</span>
            <select name="dealType" required defaultValue={c?.dealType ?? ""} className="mx-input"><option value="" disabled>고르세요</option>{DEAL_TYPES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label><span className={field}>종류 *</span>
            <select name="propertyType" required defaultValue="" className="mx-input"><option value="" disabled>고르세요</option>{PROPERTY_TYPES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={field}>소재지 * (동 이름을 꼭 넣어 주세요)</span>
            <input name="address" required maxLength={120} defaultValue={c?.address} placeholder="예: 경기도 고양시 일산동구 백석동 1234" className="mx-input" /></label>
          <label><span className={field}>가격·보증금 * (예: 4억, 3.5억, 5000)</span>
            <input name="price" required defaultValue={c ? asInput(c.price) : undefined} placeholder="만 원 단위" className="mx-input" /></label>
          <label><span className={field}>월세 (월세 매물만, 만 원)</span>
            <input name="monthly" inputMode="numeric" defaultValue={c ? asInput(c.monthly) : undefined} placeholder="예: 120" className="mx-input" /></label>
          <label><span className={field}>전용면적(㎡)</span>
            <input name="area" inputMode="decimal" defaultValue={c ? asInput(c.area) : undefined} placeholder="예: 84.9" className="mx-input" /></label>
          <label><span className={field}>층</span>
            <input name="floorInfo" maxLength={30} defaultValue={c?.floorInfo} placeholder="예: 12층/25층" className="mx-input" /></label>
        </div>
        <details className="rounded-xl border border-mx-border p-4">
          <summary className="cursor-pointer text-sm font-bold text-mx-text">광고 명시 항목 더 넣기 (선택)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label><span className={field}>방 수</span><input name="rooms" inputMode="numeric" className="mx-input" /></label>
            <label><span className={field}>욕실 수</span><input name="baths" inputMode="numeric" className="mx-input" /></label>
            <label><span className={field}>방향</span><input name="direction" maxLength={20} defaultValue={c?.direction} placeholder="예: 남향" className="mx-input" /></label>
            <label><span className={field}>입주 가능일</span><input name="moveIn" maxLength={40} placeholder="예: 즉시, 2027-02" className="mx-input" /></label>
            <label><span className={field}>주차</span><input name="parking" maxLength={30} placeholder="예: 세대당 1.2대" className="mx-input" /></label>
            <label><span className={field}>사용승인일</span><input name="approvalDate" maxLength={20} placeholder="예: 2004-06" className="mx-input" /></label>
            <label className="sm:col-span-3"><span className={field}>관리비</span><input name="mgmtFee" maxLength={40} placeholder="예: 월 25만 원 내외" className="mx-input" /></label>
          </div>
        </details>
        <label className="block"><span className={field}>메모 (나만 봄)</span>
          <textarea name="memo" maxLength={1000} rows={2} className="mx-input" /></label>
        {isCandidate && (
          <label className="flex items-start gap-2 rounded-xl border border-mx-border p-3 text-sm text-mx-text">
            <input type="checkbox" name="mandateConfirmed" value="1" checked={mandate} onChange={(e) => setMandate(e.target.checked)} className="mt-1" />
            <span>이 매물은 내 사무소가 직접 의뢰를 받았습니다. <span className="text-mx-muted">(다른 중개사의 매물을 의뢰 없이 내 매물로 광고하지 않도록 확인해 주세요. 저장하면 「후보」 상태로 들어가고 광고·문자 대상이 아니에요.)</span></span>
          </label>
        )}
        {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
        <button type="submit" disabled={pending || (isCandidate && !mandate)} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : isCandidate ? "후보로 저장" : "매물 저장"}</button>
      </form>
    </details>
  );
}
