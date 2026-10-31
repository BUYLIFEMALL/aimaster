"use client";

import { useState, useTransition } from "react";
import { testWingConnectionAction, type ConnectionResult } from "@/lib/actions/wing";
import { PlugZap, CheckCircle2, AlertCircle } from "lucide-react";

export function ConnectionTest({ saved }: { saved: boolean }) {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3.5">
      <button
        type="button"
        disabled={!saved || pending}
        onClick={() => start(async () => setResult(await testWingConnectionAction()))}
        className="btn-3d-indigo text-xs py-2 px-5"
      >
        <PlugZap size={14} className={pending ? "animate-pulse" : ""} />
        <span>{pending ? "쿠팡 WING 서버 통신 중…" : "🔌 쿠팡 WING 연결 시험"}</span>
      </button>
      {!saved && <p className="text-xs text-slate-500">API 키를 저장한 뒤 연결 시험을 진행할 수 있습니다.</p>}

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] leading-relaxed text-rose-900 font-medium flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      {result?.ok && (
        <div className="space-y-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-[13px] text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <p className="font-bold">
              쿠팡 WING 연결 성공 — 출고지 {result.places.length}곳, 반품지 {result.centers.length}곳을 확인했습니다.
            </p>
          </div>

          {result.warnings && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900">
              ⚠ 쿠팡 경고: {result.warnings}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
              <p className="text-xs font-bold text-slate-800 mb-2">🏭 등록된 출고지 ({result.places.length})</p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {result.places.map((p) => (
                  <li key={p.code} className="rounded-lg bg-white p-2 border border-slate-100 shadow-2xs">
                    <b>{p.name}</b> <span className="font-mono text-slate-500">#{p.code}</span>
                    {!p.usable && <span className="ml-1 text-rose-600 font-bold">(사용 안 함)</span>}
                    <span className="block text-slate-500 text-[11px] mt-0.5">{p.address}</span>
                  </li>
                ))}
                {!result.places.length && (
                  <li className="text-amber-800 text-xs">출고지가 없습니다. WING에서 먼저 생성해 주세요.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
              <p className="text-xs font-bold text-slate-800 mb-2">↩️ 등록된 반품지 ({result.centers.length})</p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {result.centers.map((c) => (
                  <li key={c.code} className="rounded-lg bg-white p-2 border border-slate-100 shadow-2xs">
                    <b>{c.name}</b> <span className="font-mono text-slate-500">#{c.code}</span> · {c.courierName || c.courierCode}
                    {!c.usable && <span className="ml-1 text-rose-600 font-bold">(사용 안 함)</span>}
                    <span className="block text-slate-500 text-[11px] mt-0.5">{c.address} {c.addressDetail}</span>
                  </li>
                ))}
                {!result.centers.length && (
                  <li className="text-amber-800 text-xs">반품지가 없습니다. WING에서 먼저 생성해 주세요.</li>
                )}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            상품 등록 시 적용할 기본 출고지·반품지는 「배송·반품 기본값」 화면에서 지정할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
