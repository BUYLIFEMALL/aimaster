"use client";

import { useState, useTransition } from "react";
import { deleteProxyAction, saveProxyAction } from "@/lib/actions/connection";

const btn = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";

/** 회원 본인 고정 IP 프록시 주소. 화면에는 주소의 비밀번호를 가려서 보여 준다 */
export function ProxyKeyForm({ shown }: { shown: string }) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await work();
      setNote(r.error ? `❌ ${r.error}` : `✅ ${done}`);
      if (!r.error) setUrl("");
    });
  return (
    <div className="space-y-2">
      {shown && <p className="text-[13px] font-bold text-teal-800">✅ 저장됨: <span className="font-mono font-normal">{shown}</span></p>}
      <div className="flex flex-wrap gap-2">
        <input type="password" autoComplete="new-password" aria-label="프록시 주소" placeholder={shown ? "저장됨 — 바꿀 때만 입력" : "http://fixie:토큰@내주소.usefixie.com:80"} value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <button type="button" disabled={pending || !url.trim()} onClick={() => run(() => saveProxyAction(url), "저장했습니다. 이제 WING 허용 IP를 확인해 주세요.")} className={btn}>저장</button>
        {shown && <button type="button" disabled={pending} onClick={() => run(deleteProxyAction, "지웠습니다. 다시 등록할 때까지 쿠팡 기능을 쓸 수 없습니다.")} className={btn}>지우기</button>}
      </div>
      {note && <p role="status" className="text-[13px] font-bold text-slate-800">{note}</p>}
    </div>
  );
}
