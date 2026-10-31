"use client";

import { useState, useTransition } from "react";
import { saveKeyExpiryAction } from "@/lib/actions/connection";

/** WING 키 만료일. 키를 저장하면 6개월 뒤로 자동 입력되고, 실제 만료일과 다르면 회원이 고친다 */
export function KeyExpiryForm({ expiry }: { expiry: string }) {
  const [value, setValue] = useState(expiry);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveKeyExpiryAction(value);
      setNote(r.error ? `❌ ${r.error}` : "✅ 저장했습니다.");
    });
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-slate-700">키 만료일
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-blue-500 focus:outline-none" />
        </label>
        <button type="button" disabled={pending || !value} onClick={save} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">만료일 저장</button>
      </div>
      <p className="text-[11px] text-slate-500">키를 저장한 날에서 6개월 뒤로 자동 입력됩니다. 더 일찍 발급한 키라면 발급일에서 6개월 뒤로 고쳐 주세요.</p>
      {note && <p role="status" className="text-[13px] font-bold text-slate-800">{note}</p>}
    </div>
  );
}
