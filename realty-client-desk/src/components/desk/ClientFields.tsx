"use client";

import { useState } from "react";
import { DEAL_SIDES, DEAL_TYPES, PROPERTY_TYPES, type DealType } from "@/lib/desk/consent";

// 고객 조건 칸 — 고객 접수 링크(/i/[token])와 중개사 직접 입력(/clients)이 함께 쓴다
// v1.09(2026-11-04): 거래마다 입장(매매 = 매수/매도, 전세·월세 = 임차/임대)을 함께 고른다
const label = "mb-1 block text-xs font-semibold text-mx-muted";
const SIDE_HINT: Record<string, string> = { 매수: "사려고 해요", 매도: "팔려고 해요", 임차: "구하고 있어요(세입자)", 임대: "내놓으려고 해요(집주인)" };

export function ClientFields() {
  const [deal, setDeal] = useState<DealType>("매매");
  const [side, setSide] = useState<string>(DEAL_SIDES["매매"][0]);
  const pickDeal = (d: DealType) => {
    setDeal(d);
    if (!DEAL_SIDES[d].includes(side)) setSide(DEAL_SIDES[d][0]);
  };
  const isSeller = side === "매도" || side === "임대";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={label} htmlFor="name">이름 *</label>
        <input id="name" name="name" required maxLength={40} className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="phone">휴대폰 *</label>
        <input id="phone" name="phone" required inputMode="tel" pattern="01[016789][\-\s]?[0-9]{3,4}[\-\s]?[0-9]{4}" title="010으로 시작하는 휴대폰 번호" placeholder="010-1234-5678" className="mx-input" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>원하는 거래 *</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mx-text">
          {DEAL_TYPES.map((d) => (
            <label key={d} className="flex min-h-[40px] items-center gap-2">
              <input type="radio" name="dealType" value={d} checked={deal === d} onChange={() => pickDeal(d)} className="h-4 w-4" /> {d}
            </label>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-[#f4f6f9] px-3 text-sm text-mx-text">
          {DEAL_SIDES[deal].map((s) => (
            <label key={s} className="flex min-h-[40px] items-center gap-2">
              <input type="radio" name="dealSide" value={s} checked={side === s} onChange={() => setSide(s)} className="h-4 w-4" />
              <b>{s}</b><span className="text-xs text-mx-muted">{SIDE_HINT[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="regions">{isSeller ? "물건 지역·주소" : "원하는 지역"}</label>
        <input id="regions" name="regions" maxLength={200} placeholder={isSeller ? "예: 고양시 일산동구 백석동 1234" : "예: 고양시 일산동구 백석동, 마두동"} className="mx-input" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>유형(여러 개 가능)</legend>
        <div className="grid grid-cols-2 gap-x-3 text-sm text-mx-text sm:grid-cols-5">
          {PROPERTY_TYPES.map((t) => (
            <label key={t} className="flex min-h-[40px] items-center gap-2">
              <input type="checkbox" name="propertyTypes" value={t} className="h-4 w-4" /> {t}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className={label} htmlFor="budgetMin">{isSeller ? "희망 가격 최소 (매매가·보증금)" : "예산 최소 (매매가·보증금)"}</label>
        <input id="budgetMin" name="budgetMin" placeholder="예: 3억" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="budgetMax">{isSeller ? "희망 가격 최대" : "예산 최대"}</label>
        <input id="budgetMax" name="budgetMax" placeholder="예: 5억" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="monthlyMax">{isSeller ? "희망 월세(월세일 때)" : "월세 최대(월세일 때)"}</label>
        <input id="monthlyMax" name="monthlyMax" placeholder="예: 100" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="areaMin">{isSeller ? "면적(전용 ㎡)" : "면적 최소(전용 ㎡)"}</label>
        <input id="areaMin" name="areaMin" inputMode="decimal" placeholder="예: 59" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="moveIn">{isSeller ? "비워 줄 수 있는 시기" : "입주 시기"}</label>
        <input id="moveIn" name="moveIn" maxLength={40} placeholder="예: 2027년 3월, 협의 가능" className="mx-input" />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="memo">메모</label>
        <textarea id="memo" name="memo" maxLength={1000} rows={3} className="mx-input" />
      </div>
    </div>
  );
}
