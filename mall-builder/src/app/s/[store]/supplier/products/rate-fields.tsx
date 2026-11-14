"use client";

// M1-2(0068) 수수료율 방식 몰의 공급사 입력 — 판매가·리셀러 판매수수료율을 넣으면 본사 수수료·리셀러 몫·내 공급가를 바로 보여 준다
// 본사율은 본사가 정한 값(읽기 전용). 실제 공급가는 DB가 같은 식으로 다시 계산한다(src/lib/supplier.ts rateSplit)
import { useState } from "react";
import { rateSplit } from "@/lib/supplier";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function RateFields({ isNew, basePrice, hqRate, resellerRate }: { isNew: boolean; basePrice: number; hqRate: number; resellerRate: number }) {
  const [price, setPrice] = useState(isNew ? "" : String(basePrice));
  const [rate, setRate] = useState(String(resellerRate));
  const p = Number(price.replace(/[^0-9]/g, "")) || 0;
  const r = Math.min(50, Math.max(0, Number(rate) || 0));
  const s = rateSplit(p, hqRate, r);
  return (
    <div className="space-y-3" data-rate-fields>
      <div className="grid gap-3 sm:grid-cols-2">
        {isNew ? (
          <label className="block">
            <span className="font-medium">판매가(희망) *</span>
            <input name="base_price" required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded border px-2 py-2" />
            <span className="mt-1 block text-xs text-gray-500">최종 판매가는 본사가 승인할 때 정합니다(바뀌면 공급가도 같은 비율로 다시 계산).</span>
          </label>
        ) : (
          <div>
            <span className="font-medium">판매가</span>
            <p className="mt-1 rounded bg-gray-50 px-2 py-2 text-gray-600">{won(basePrice)} · 본사가 정합니다</p>
          </div>
        )}
        <label className="block">
          <span className="font-medium">리셀러 판매수수료율 *</span>
          <span className="mt-1 flex items-center gap-1">
            <input name="reseller_rate" required inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="w-24 rounded border px-2 py-2" />%
          </span>
          <span className="mt-1 block text-xs text-gray-500">리셀러가 제휴 링크로 팔면 판매가의 이 비율을 본사가 대신 지급합니다(0~50%).</span>
        </label>
      </div>
      <div className="rounded border bg-blue-50/50 p-3 text-xs" data-rate-preview>
        <p className="font-semibold text-gray-800">이 판매가로 1개 팔리면</p>
        <ul className="mt-1 grid gap-1 sm:grid-cols-3">
          <li>본사 판매수수료 {hqRate}% <b className="block text-sm">{won(s.hq)}</b></li>
          <li>리셀러 수수료 {r}% <b className="block text-sm">{won(s.reseller)}</b></li>
          <li>내 공급가(입금액) <b className="block text-sm text-blue-700" data-rate-supply>{won(s.supply)}</b></li>
        </ul>
        <p className="mt-1 text-gray-500">본사 판매수수료율은 본사가 정한 값입니다. 리셀러 링크 없이 팔려도 내 공급가는 같습니다.</p>
      </div>
    </div>
  );
}
