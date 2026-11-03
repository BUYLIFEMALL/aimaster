"use client";

import { useActionState } from "react";
import { addListingAction, type ListingState } from "@/lib/actions/listings";
import { DEAL_TYPES, PROPERTY_TYPES } from "@/lib/desk/consent";

const field = "mb-1 block text-xs font-semibold text-mx-muted";

// 2단계(2026-11-03): 내 매물 등록. 소재지에 동 이름이 들어가야 고객 「원하는 지역」과 맞춰 본다.
// 공인중개사법 광고 명시 항목(면적·층·방향·방/욕실·입주·주차·사용승인·관리비) 칸을 미리 둔다(점검은 4단계).
export function AddListingForm() {
  const [state, action, pending] = useActionState<ListingState, FormData>(addListingAction, {});
  return (
    <details className="mx-card p-5" open={Boolean(state.error)}>
      <summary className="cursor-pointer text-base font-bold text-mx-text">➕ 매물 등록</summary>
      <form action={action} key={state.success ?? "form"} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={field}>매물 이름 *</span>
            <input name="title" required maxLength={60} placeholder="예: 백석동 동문굿모닝힐 84㎡ 남향" className="mx-input" /></label>
          <label><span className={field}>거래 *</span>
            <select name="dealType" required defaultValue="" className="mx-input"><option value="" disabled>고르세요</option>{DEAL_TYPES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label><span className={field}>종류 *</span>
            <select name="propertyType" required defaultValue="" className="mx-input"><option value="" disabled>고르세요</option>{PROPERTY_TYPES.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={field}>소재지 * (동 이름을 꼭 넣어 주세요)</span>
            <input name="address" required maxLength={120} placeholder="예: 경기도 고양시 일산동구 백석동 1234" className="mx-input" /></label>
          <label><span className={field}>가격·보증금 * (예: 4억, 3.5억, 5000)</span>
            <input name="price" required placeholder="만 원 단위" className="mx-input" /></label>
          <label><span className={field}>월세 (월세 매물만, 만 원)</span>
            <input name="monthly" inputMode="numeric" placeholder="예: 120" className="mx-input" /></label>
          <label><span className={field}>전용면적(㎡)</span>
            <input name="area" inputMode="decimal" placeholder="예: 84.9" className="mx-input" /></label>
          <label><span className={field}>층</span>
            <input name="floorInfo" maxLength={30} placeholder="예: 12층/25층" className="mx-input" /></label>
        </div>
        <details className="rounded-xl border border-mx-border p-4">
          <summary className="cursor-pointer text-sm font-bold text-mx-text">광고 명시 항목 더 넣기 (선택)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label><span className={field}>방 수</span><input name="rooms" inputMode="numeric" className="mx-input" /></label>
            <label><span className={field}>욕실 수</span><input name="baths" inputMode="numeric" className="mx-input" /></label>
            <label><span className={field}>방향</span><input name="direction" maxLength={20} placeholder="예: 남향" className="mx-input" /></label>
            <label><span className={field}>입주 가능일</span><input name="moveIn" maxLength={40} placeholder="예: 즉시, 2027-02" className="mx-input" /></label>
            <label><span className={field}>주차</span><input name="parking" maxLength={30} placeholder="예: 세대당 1.2대" className="mx-input" /></label>
            <label><span className={field}>사용승인일</span><input name="approvalDate" maxLength={20} placeholder="예: 2004-06" className="mx-input" /></label>
            <label className="sm:col-span-3"><span className={field}>관리비</span><input name="mgmtFee" maxLength={40} placeholder="예: 월 25만 원 내외" className="mx-input" /></label>
          </div>
        </details>
        <label className="block"><span className={field}>메모 (나만 봄)</span>
          <textarea name="memo" maxLength={1000} rows={2} className="mx-input" /></label>
        {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "매물 저장"}</button>
      </form>
    </details>
  );
}
