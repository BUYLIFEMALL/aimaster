"use client";

import { useActionState } from "react";
import { saveOfficeAction, type ListingState } from "@/lib/actions/listings";

export type OfficeData = { office_name: string; office_phone: string; office_address: string | null; reject_080: string | null; reg_no?: string | null; broker_name?: string | null } | null;

// 광고 문자 맨 앞 「(광고)사무소 이름 전화번호」와 맨 끝 무료 수신거부에 들어가는 값(정보통신망법 시행령 별표 6)
export function OfficeForm({ office }: { office: OfficeData }) {
  const [state, action, pending] = useActionState<ListingState, FormData>(saveOfficeAction, {});
  return (
    <form action={action} className="mx-card space-y-3 p-5">
      <h2 className="text-lg font-bold text-mx-text">🏢 사무소 정보 (광고 문자에 들어가요)</h2>
      <p className="text-sm text-mx-muted">매물 안내 문자는 법에 따라 맨 앞에 <b>(광고)사무소 이름 전화번호</b>, 맨 끝에 <b>무료 수신거부 방법</b>이 자동으로 붙어요.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">사무소 이름 *</span>
          <input name="officeName" required maxLength={40} defaultValue={office?.office_name ?? ""} placeholder="예: 백석공인중개사사무소" className="mx-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">사무소 전화번호 *</span>
          <input name="officePhone" required maxLength={20} defaultValue={office?.office_phone ?? ""} placeholder="예: 031-123-4567" className="mx-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">사무소 주소 (선택)</span>
          <input name="officeAddress" maxLength={120} defaultValue={office?.office_address ?? ""} className="mx-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">중개사무소 등록번호 (매물 광고에 표시)</span>
          <input name="regNo" maxLength={40} defaultValue={office?.reg_no ?? ""} placeholder="예: 41285-2020-00001" className="mx-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">개업공인중개사 성명 (매물 광고에 표시)</span>
          <input name="brokerName" maxLength={20} defaultValue={office?.broker_name ?? ""} className="mx-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-mx-muted">080 무료 수신거부 번호 (선택)</span>
          <input name="reject080" maxLength={20} pattern="080-?\d{3,4}-?\d{4}" defaultValue={office?.reject_080 ?? ""} placeholder="없으면 비워 두세요" className="mx-input" />
        </label>
      </div>
      <p className="text-xs text-mx-muted">💡 080 번호가 없어도 괜찮아요. 문자 끝에 고객마다 다른 <b>무료 수신거부 링크</b>가 붙고, 고객이 누르면 바로 수신거부돼요.</p>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
      <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "사무소 정보 저장"}</button>
    </form>
  );
}
