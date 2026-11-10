"use client";

import { useState, useTransition } from "react";
import { deleteElevenstKeyAction, deleteProxyAction, saveElevenstKeyAction, saveProxyAction } from "@/lib/actions/connection";

const btn = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";

/** 11번가 API 키·고정 IP 주소 입력 한 칸. 저장된 값은 가려서 보여 준다 */
export function KeyForm({ kind, shown }: { kind: "elevenst" | "proxy"; shown: string }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const isKey = kind === "elevenst";
  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await work();
      setNote(r.error ? `❌ ${r.error}` : `✅ ${done}`);
      if (!r.error) setValue("");
    });
  return (
    <div className="space-y-2">
      {shown && (
        <p className="text-[13px] font-bold text-teal-800">
          ✅ 저장됨: <span className="font-mono font-normal">{shown}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          autoComplete="new-password"
          aria-label={isKey ? "11번가 API 키" : "고정 IP 주소"}
          placeholder={shown ? "저장됨 — 바꿀 때만 입력" : isKey ? "11번가 API 관리 화면의 키" : "http://fixie:토큰@내주소.usefixie.com:80"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button type="button" disabled={pending || !value.trim()} onClick={() => run(() => (isKey ? saveElevenstKeyAction(value) : saveProxyAction(value)), "저장했습니다.")} className={btn}>
          저장
        </button>
        {shown && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(isKey ? deleteElevenstKeyAction : deleteProxyAction, isKey ? "지웠습니다. 상품소싱기의 11번가 비교도 함께 멈춥니다." : "지웠습니다. 쿠팡 운영의 고정 IP도 함께 지워졌습니다.")}
            className={btn}
          >
            지우기
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        {isKey ? "같은 키를 상품소싱기(11번가 소싱 비교)도 함께 씁니다. 지우면 그쪽도 멈춥니다." : "같은 주소를 쿠팡 운영도 함께 씁니다. 지우면 그쪽도 멈춥니다."}
      </p>
      {note && <p role="status" className="text-[13px] font-bold text-slate-800">{note}</p>}
    </div>
  );
}
