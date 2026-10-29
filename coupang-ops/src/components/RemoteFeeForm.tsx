"use client";

import { useState, useTransition } from "react";
import { updateRemoteFeeAction, type RemoteFeeResult } from "@/lib/actions/wing";

/** 출고지의 제주·도서산간 추가배송비를 WING에 저장(쿠팡 설정을 바꿈). 0원 또는 1,000~8,000원(100원 단위) */
export function RemoteFeeForm({ placeCode }: { placeCode: string }) {
  const [jeju, setJeju] = useState(5000);
  const [notJeju, setNotJeju] = useState(5000);
  const [result, setResult] = useState<RemoteFeeResult | null>(null);
  const [pending, start] = useTransition();
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  if (!placeCode) return <p className="text-xs text-slate-500">출고지를 저장하면 제주·도서산간 추가배송비를 바꿀 수 있습니다.</p>;
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">제주 추가배송비(원)</span>
          <input inputMode="numeric" value={jeju || ""} onChange={(e) => setJeju(num(e.target.value))} className={input} /></label>
        <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">제주 외 도서산간 추가배송비(원)</span>
          <input inputMode="numeric" value={notJeju || ""} onChange={(e) => setNotJeju(num(e.target.value))} className={input} /></label>
        <div className="flex items-end">
          <button type="button" disabled={pending} onClick={() => start(async () => setResult(await updateRemoteFeeAction(placeCode, jeju, notJeju)))}
            className="w-full rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50">
            {pending ? "쿠팡에 저장 중…" : "🏝 WING 출고지에 저장"}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">쿠팡 WING의 출고지 설정({placeCode})을 바꿉니다. 0원 또는 1,000~8,000원(100원 단위, 쿠팡 규칙).</p>
      {result && !result.ok && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {result.error}</p>}
      {result?.ok && <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">✅ 쿠팡에 저장됨 — {result.courier} 제주 {result.jeju.toLocaleString()}원 · 도서산간 {result.notJeju.toLocaleString()}원(다시 읽어 확인)</p>}
    </div>
  );
}
