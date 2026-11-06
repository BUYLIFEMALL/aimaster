"use client";
import { useEffect, useState } from "react";
import { recruit, type Member, type Sent } from "./call";

// 모드 A-1: 확장이 게시판 목록에서 모은 카페 활동 회원(닉네임·등급) 명단. 아이디는 없다.
export function MembersPanel() {
  const [members, setMembers] = useState<Member[] | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { recruit<{ members: Member[] }>("members_list").then(v => setMembers(v.members ?? []), e => setMsg(e instanceof Error ? e.message : "명단을 불러오지 못했습니다.")); }, []);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold text-slate-900">🔎 카페 활동 회원 명단 {members ? `· ${members.length}명` : ""}</h2>
    <p className="mt-1 text-xs text-slate-500">확장이 게시판 목록 화면에서 읽은 글쓴이 닉네임·등급입니다(아이디 없음). 엑셀 「활동 회원 명단」 시트로도 받습니다. 30일 뒤 자동으로 지워집니다.</p>
    {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
    {members && (members.length === 0 ? <p className="mt-3 text-sm text-slate-500">아직 모은 명단이 없습니다. 「모집 방식·설정」에서 A를 켜고, 가입한 카페 게시판 목록에서 확장의 「이 게시판 작성자 명단 모으기」를 누르세요.</p> :
      <ul className="mt-3 max-h-96 divide-y overflow-y-auto text-sm">{members.slice(0, 300).map(m => <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span><b>{m.nickname}</b>{m.member_grade ? <span className="text-slate-500"> · {m.member_grade}</span> : null}</span>
        <span className="text-slate-600">{m.cafe_name || `카페 ${m.cafe_id}`}{m.board_name ? ` · ${m.board_name}` : ""} · {new Date(m.last_seen_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span></li>)}</ul>)}
    {members && members.length > 300 && <p className="mt-2 text-xs text-slate-500">화면에는 최근 300명만 보입니다. 전체는 엑셀로 받으세요.</p>}
  </section>;
}

const RESULT: Record<Sent["result"], string> = { sent: "✅ 보냄", failed: "실패", limited: "⛔ 제한으로 그날 중지" };

export function ResultsPanel() {
  const [data, setData] = useState<{ sent: Sent[]; used_today: number; cap: number } | null>(null), [msg, setMsg] = useState("");
  useEffect(() => { recruit<{ sent: Sent[]; used_today: number; cap: number }>("sent_list").then(setData, e => setMsg(e instanceof Error ? e.message : "기록을 불러오지 못했습니다.")); }, []);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">보낸 초대 결과 {data ? `· 오늘 ${data.used_today}/${data.cap}건` : ""}</h2>
      <a href="/api/export" className="rounded-xl bg-[#03c75a] px-4 py-2 text-sm font-bold text-white">📥 엑셀로 내려받기</a>
    </div>
    <p className="mt-1 text-xs text-slate-500">모은 대상·초대 기록·활동 회원 명단을 한 파일(시트 3개)로 내려받습니다. 기록은 30일 뒤 자동으로 지워집니다.</p>
    {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
    {data && (data.sent.length === 0 ? <p className="mt-3 text-sm text-slate-500">아직 보낸 초대가 없습니다.</p> :
      <ul className="mt-3 divide-y text-sm">{data.sent.map(s => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span><b>{s.naver_id}</b> <span className="text-slate-500">→ 카페 {s.cafe_id}</span></span>
        <span className="text-slate-600">{RESULT[s.result]}{s.detail ? ` · ${s.detail}` : ""} · {new Date(s.sent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span></li>)}</ul>)}
  </section>;
}
