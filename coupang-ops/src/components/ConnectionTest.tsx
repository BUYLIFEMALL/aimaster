"use client";

import { useState, useTransition } from "react";
import { testWingConnectionAction, type ConnectionResult } from "@/lib/actions/wing";

export function ConnectionTest({ saved }: { saved: boolean }) {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!saved || pending}
        onClick={() => start(async () => setResult(await testWingConnectionAction()))}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? "쿠팡에 묻는 중…" : "🔌 연결 시험"}
      </button>
      {!saved && <p className="text-xs text-slate-500">키를 저장하면 누를 수 있습니다.</p>}

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-rose-900">❌ {result.error}</div>
      )}
      {result?.ok && (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-[13px] text-teal-900">
          <p className="font-bold">✅ 쿠팡 연결 성공 — 출고지 {result.places.length}곳, 반품지 {result.centers.length}곳을 불러왔습니다.</p>
          {result.warnings && <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">⚠ 쿠팡 경고: {result.warnings}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-slate-700">🏭 출고지</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-700">
                {result.places.map((p) => (
                  <li key={p.code} className="rounded-lg bg-white px-2 py-1">
                    <b>{p.name}</b> <span className="font-mono text-slate-500">#{p.code}</span>{!p.usable && <span className="ml-1 text-blue-700">(사용 안 함)</span>}
                    <span className="block text-slate-500">{p.address}</span>
                    {p.remote.length > 0 ? <span className="block text-[11px] text-slate-500">🏝 제주·도서산간 추가: {p.remote.map((x) => `${x.courier} 제주 ${x.jeju.toLocaleString()}원 · 도서산간 ${x.notJeju.toLocaleString()}원`).join(" / ")}</span> : <span className="block text-[11px] text-slate-400">🏝 제주·도서산간 추가배송비 설정 없음</span>}
                  </li>
                ))}
                {!result.places.length && <li className="text-amber-800">출고지가 없습니다. WING에서 먼저 만들어 주세요.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">↩️ 반품지</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-700">
                {result.centers.map((c) => (
                  <li key={c.code} className="rounded-lg bg-white px-2 py-1">
                    <b>{c.name}</b> <span className="font-mono text-slate-500">#{c.code}</span> · {c.courierName || c.courierCode}{!c.usable && <span className="ml-1 text-blue-700">(사용 안 함)</span>}
                    <span className="block text-slate-500">{c.address} {c.addressDetail}</span>
                  </li>
                ))}
                {!result.centers.length && <li className="text-amber-800">반품지가 없습니다. WING에서 먼저 만들어 주세요.</li>}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">상품 등록에 쓸 출고지·반품지는 「배송·반품 기본값」 화면에서 고릅니다. 제주·도서산간 추가배송비는 출고지마다 WING에서 정합니다.</p>
        </div>
      )}
    </div>
  );
}
