"use client";

import { useState, useTransition } from "react";
import { deleteElevenstKeyAction, saveElevenstKeyAction } from "@/lib/actions/connection";

const btn = "rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50";

/** 11번가 API 키 입력 칸. 저장된 값은 가려서 보여 준다 */
export function KeyForm({ shown }: { shown: string }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await work();
      setNote(r.error ? `❌ ${r.error}` : `✅ ${done}`);
      if (!r.error) setValue("");
    });
  return (
    <div className="space-y-3">
      {shown && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <span>✅ 현재 등록된 키:</span>
          <span className="font-mono font-semibold text-emerald-700">{shown}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          autoComplete="new-password"
          aria-label="11번가 API 키"
          placeholder={shown ? "저장됨 — 키를 변경할 때만 새로 입력" : "11번가 API 관리 화면의 키 입력"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-[#FA0050] focus:ring-2 focus:ring-rose-500/15 focus:outline-none"
        />
        <button
          type="button"
          disabled={pending || !value.trim()}
          onClick={() => run(() => saveElevenstKeyAction(value), "11번가 API 키를 안전하게 저장했습니다.")}
          className="btn-3d-11st !py-2 !px-5 !text-xs"
        >
          {pending ? "저장 중…" : "키 저장하기"}
        </button>
        {shown && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(deleteElevenstKeyAction, "등록된 키를 삭제했습니다. 상품소싱기의 11번가 비교도 함께 멈춥니다.")}
            className={btn}
          >
            삭제
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        * 동일한 키를 상품소싱기(11번가 소싱 비교)에서도 공용으로 활용합니다. 삭제 시 소싱기 연동도 중지됩니다.
      </p>
      {note && <p role="status" className="text-xs font-bold text-slate-800">{note}</p>}
    </div>
  );
}
