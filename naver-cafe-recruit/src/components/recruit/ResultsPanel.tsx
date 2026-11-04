"use client";
import { useEffect, useState } from "react";
import { recruit, type Sent } from "./call";

const RESULT: Record<Sent["result"], string> = { sent: "✅ 보냄", failed: "실패", limited: "⛔ 제한으로 그날 중지" };

export function ResultsPanel() {
  const [data, setData] = useState<{ sent: Sent[]; used_today: number; cap: number } | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { recruit<{ sent: Sent[]; used_today: number; cap: number }>("sent_list").then(setData, e => setMsg(e instanceof Error ? e.message : "기록을 불러오지 못했습니다.")); }, []);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">보낸 초대 결과 {data ? `· 오늘 ${data.used_today}/${data.cap}건` : ""}</h2>
      <a href="/api/export" className="rounded-xl bg-[#03c75a] px-4 py-2 text-sm font-bold text-white">📥 엑셀로 내려받기</a>
    </div>
    <p className="mt-1 text-xs text-slate-500">모은 명단과 초대 기록을 한 파일(시트 2개)로 내려받습니다. 기록은 30일 뒤 자동으로 지워집니다.</p>
    {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
    {data && (data.sent.length === 0 ? <p className="mt-3 text-sm text-slate-500">아직 보낸 초대가 없습니다.</p> :
      <ul className="mt-3 divide-y text-sm">{data.sent.map(s => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span><b>{s.naver_id}</b> <span className="text-slate-500">→ 카페 {s.cafe_id}</span></span>
        <span className="text-slate-600">{RESULT[s.result]}{s.detail ? ` · ${s.detail}` : ""} · {new Date(s.sent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span></li>)}</ul>)}
  </section>;
}
