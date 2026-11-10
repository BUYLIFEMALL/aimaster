"use client";

import { useState, useTransition } from "react";
import { testConnectionAction, type ConnectionResult } from "@/lib/actions/connection";

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
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
      >
        {pending ? "확인 중…" : "🔌 연결 시험(읽기만)"}
      </button>
      {!ready && <p className="text-xs text-slate-500">11번가 API 키를 먼저 저장해 주세요.</p>}
      {result && !result.ok && <p role="status" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-800">❌ {result.error}</p>}
      {result && result.ok && (
        <div role="status" className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
          <p className="font-bold">✅ 연결됐습니다. 11번가가 키를 받아들였습니다.</p>
          {[
            ["출고지", result.outbound],
            ["반품/교환지", result.inbound],
          ].map(([label, list]) => (
            <div key={label as string}>
              <p className="font-bold">{label as string} {(list as { seq: string }[]).length}곳</p>
              <ul className="ml-4 list-disc">
                {(list as { seq: string; name: string; addr: string }[]).map((a) => (
                  <li key={a.seq}>
                    <span className="font-mono">#{a.seq}</span> {a.name} — {a.addr}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {result.outbound.length === 0 && <p>출고지가 없습니다. 11번가 셀러오피스에서 출고지를 먼저 등록해 주세요.</p>}
        </div>
      )}
    </div>
  );
}
