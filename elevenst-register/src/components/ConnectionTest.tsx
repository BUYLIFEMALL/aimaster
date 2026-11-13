"use client";

import { useState, useTransition } from "react";
import { testConnectionAction, type ConnectionResult } from "@/lib/actions/connection";
import { PlugZap, CheckCircle2, AlertTriangle } from "lucide-react";

/** 연결 시험 버튼 — 출고지·반품/교환지 주소를 읽기만 한다(11번가에 아무것도 만들지 않음) */
export function ConnectionTest({ ready }: { ready: boolean }) {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!ready || pending}
        onClick={() => start(async () => setResult(await testConnectionAction()))}
        className="btn-3d-red !py-2.5 !px-5 !text-xs flex items-center gap-1.5"
      >
        <PlugZap size={15} />
        <span>{pending ? "11번가 서버 연결 확인 중…" : "11번가 연결 시험 (읽기 전용)"}</span>
      </button>
      {!ready && <p className="text-xs text-slate-500">* 11번가 API 키를 먼저 등록해 주세요.</p>}
      {result && !result.ok && (
        <div role="status" className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertTriangle size={15} className="text-rose-600 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
      {result && result.ok && (
        <div role="status" className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-[13px] text-emerald-950">
          <p className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            연결 성공: 11번가 OPEN API 센터와 정상 통신되었습니다.
          </p>
          {[
            ["출고지 주소", result.outbound],
            ["반품/교환지 주소", result.inbound],
          ].map(([label, list]) => (
            <div key={label as string} className="pt-1">
              <p className="font-bold text-xs text-emerald-900">{label as string} {(list as { seq: string }[]).length}개 등록됨</p>
              <ul className="ml-4 list-disc text-xs text-slate-700 space-y-0.5 mt-0.5">
                {(list as { seq: string; name: string; addr: string }[]).map((a) => (
                  <li key={a.seq}>
                    <span className="font-mono font-bold text-emerald-800">#{a.seq}</span> {a.name} — {a.addr}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {result.outbound.length === 0 && <p className="text-xs text-amber-800 font-bold pt-1">⚠ 출고지가 없습니다. 11번가 셀러오피스에서 출고지를 먼저 등록해 주세요.</p>}
        </div>
      )}
    </div>
  );
}
